from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import qrcode
from PIL import Image, ImageDraw, ImageFont
import os, random
from groq import Groq

app = Flask(__name__)
app.secret_key = "parkbridge_secret_2025"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///parkbridge.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

QR_FOLDER = os.path.join("static", "qr_codes")
os.makedirs(QR_FOLDER, exist_ok=True)

# ── GROQ CLIENT ──
GROQ_API_KEY = "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"
groq_client  = Groq(api_key=GROQ_API_KEY)

# ──────────────────────────────────────────────
# MODELS
# ──────────────────────────────────────────────

class User(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    name     = db.Column(db.String(100), nullable=False)
    phone    = db.Column(db.String(20),  nullable=False, unique=True)
    email    = db.Column(db.String(120), nullable=False)
    otp      = db.Column(db.String(6))
    verified = db.Column(db.Boolean, default=False)
    created  = db.Column(db.DateTime, default=datetime.utcnow)
    vehicles = db.relationship("Vehicle", backref="owner", lazy=True)

class Vehicle(db.Model):
    id      = db.Column(db.Integer, primary_key=True)
    number  = db.Column(db.String(20), nullable=False, unique=True)
    type    = db.Column(db.String(50))
    color   = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created = db.Column(db.DateTime, default=datetime.utcnow)

class Message(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    vehicle_no = db.Column(db.String(20), nullable=False)
    sender_id  = db.Column(db.String(50))          # session id of sender
    text       = db.Column(db.Text, nullable=False)
    ai_approved= db.Column(db.Boolean, default=False)
    timestamp  = db.Column(db.DateTime, default=datetime.utcnow)

class Alert(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    vehicle_no = db.Column(db.String(20), nullable=False)
    message    = db.Column(db.Text)
    timestamp  = db.Column(db.DateTime, default=datetime.utcnow)

# ──────────────────────────────────────────────
# AI MESSAGE CHECKER  — powered by Groq (llama-3.3-70b)
# Rules:
#   1. Must be related to vehicle/parking/car blockage
#   2. Must NOT contain abusive, offensive, or rude language
#   3. Mixed messages (abusive + polite) are also BLOCKED
# ──────────────────────────────────────────────

def ai_check_message(text: str) -> tuple[bool, str]:
    """
    Returns (is_approved: bool, user_facing_reason: str)
    Uses Groq LLaMA-3.3-70b to judge every message.
    """
    if len(text.strip()) < 3:
        return False, "Message is too short to send."

    system_prompt = """You are a strict message moderator for ParkBridge — a parking alert app.

Your job is to decide if a message sent by a stranger to a vehicle owner should be APPROVED or BLOCKED.

APPROVE only if ALL of these are true:
  1. The message is clearly related to a parked vehicle causing a problem (blocking, no-parking zone, double parked, needs to be moved, etc.)
  2. The message is respectful and does NOT contain any abusive, offensive, insulting, threatening, or rude language — even mildly rude.
  3. The message is not spam, gibberish, or unrelated content.

BLOCK if ANY of these are true:
  - Contains abusive, vulgar, insulting, or offensive words — even if parking-related (e.g. "you idiot move your car" → BLOCK)
  - Mixed message: starts abusive then turns polite (e.g. "@#$%! ...kindly remove the vehicle" → BLOCK)
  - Not related to parking or vehicle blocking at all
  - Threatening language of any kind
  - Random or gibberish text

Respond ONLY in this exact JSON format, nothing else:
{"approved": true/false, "reason": "short reason for user"}

If approved: reason should be "OK"
If blocked: reason should be a SHORT polite explanation for the user (max 10 words), like:
  - "Message contains abusive language. Please be respectful."
  - "Message is not related to parking or car blockage."
  - "Threatening language is not allowed."
  - "Mixed abusive and polite content is not accepted."
"""

    user_prompt = f'Message to check: "{text}"'

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            max_tokens=80,
            temperature=0.1   # low temp = consistent, strict judgement
        )
        raw = response.choices[0].message.content.strip()

        # Parse JSON response
        import json
        # Handle if model wraps in ```json ... ```
        if "```" in raw:
            raw = raw.split("```")[1].replace("json","").strip()

        result = json.loads(raw)
        approved = bool(result.get("approved", False))
        reason   = result.get("reason", "Message could not be verified.")
        return approved, reason

    except Exception as e:
        # If Groq fails for any reason, fall back to keyword check
        print(f"[Groq error] {e} — falling back to keyword check")
        lower = text.lower()
        parking_words = ["car","vehicle","block","move","park","parking","stuck","exit","remove","kindly","please","urgent"]
        abuse_words   = ["idiot","stupid","fool","#","@#","bloody","shut","hate","kill","damn","bastard","ass","hell"]
        has_parking = any(w in lower for w in parking_words)
        has_abuse   = any(w in lower for w in abuse_words)
        if has_abuse:
            return False, "Message contains abusive language. Please be respectful."
        if not has_parking:
            return False, "Message is not related to car blockage."
        return True, "OK"

# ──────────────────────────────────────────────
# QR CODE GENERATOR
# ──────────────────────────────────────────────

def generate_qr(vehicle_number: str, base_url: str) -> str:
    url = f"{base_url}/contact/{vehicle_number}"
    qr  = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0d0d1a", back_color="#f5f0d0").convert("RGB")

    # Add label below QR
    label_h = 50
    new_img = Image.new("RGB", (img.width, img.height + label_h), "#f5f0d0")
    new_img.paste(img, (0, 0))
    draw = ImageDraw.Draw(new_img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except:
        font  = ImageFont.load_default()
        small = font
    draw.text((img.width//2, img.height + 8),  vehicle_number,   fill="#0d0d1a", font=font,  anchor="mt")
    draw.text((img.width//2, img.height + 30), "Scan if vehicle is blocking", fill="#555",  font=small, anchor="mt")

    filename = f"qr_{vehicle_number}.png"
    path = os.path.join(QR_FOLDER, filename)
    new_img.save(path)
    return filename

# ──────────────────────────────────────────────
# ROUTES  —  PAGES
# ──────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/contact/<vehicle_number>")
def contact(vehicle_number):
    vehicle = Vehicle.query.filter_by(number=vehicle_number.upper()).first()
    if not vehicle:
        return render_template("not_found.html", vehicle_number=vehicle_number)
    # Fetch latest messages for this vehicle (approved only)
    messages = Message.query.filter_by(vehicle_no=vehicle_number.upper(), ai_approved=True)\
                            .order_by(Message.timestamp.asc()).limit(50).all()
    return render_template("contact.html",
                           vehicle=vehicle,
                           messages=messages,
                           session_id=session.get("sid", "guest"))

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

# ──────────────────────────────────────────────
# ROUTES  —  API
# ──────────────────────────────────────────────

@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    data  = request.json
    name  = data.get("name","").strip()
    phone = data.get("phone","").strip()
    email = data.get("email","").strip()
    if not all([name, phone, email]):
        return jsonify({"ok": False, "msg": "All fields required."})
    otp = str(random.randint(100000, 999999))
    # Upsert user
    user = User.query.filter_by(phone=phone).first()
    if not user:
        user = User(name=name, phone=phone, email=email)
        db.session.add(user)
    else:
        user.name  = name
        user.email = email
    user.otp      = otp
    user.verified = False
    db.session.commit()
    # In production send via Fast2SMS/Twilio — here we return for demo
    print(f"[OTP] {phone} → {otp}")
    return jsonify({"ok": True, "demo_otp": otp, "msg": f"OTP sent to {phone}"})

@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    data  = request.json
    phone = data.get("phone","").strip()
    otp   = data.get("otp","").strip()
    user  = User.query.filter_by(phone=phone).first()
    if not user or user.otp != otp:
        return jsonify({"ok": False, "msg": "Invalid OTP."})
    user.verified = True
    db.session.commit()
    session["user_id"] = user.id
    session["sid"]     = f"u{user.id}"
    return jsonify({"ok": True, "user": {"id": user.id, "name": user.name}})

@app.route("/api/register-vehicle", methods=["POST"])
def register_vehicle():
    data    = request.json
    user_id = session.get("user_id") or data.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "msg": "Not logged in."})
    number = data.get("number","").strip().upper()
    vtype  = data.get("type","Car")
    color  = data.get("color","—")
    if not number:
        return jsonify({"ok": False, "msg": "Vehicle number required."})
    existing = Vehicle.query.filter_by(number=number).first()
    if existing and existing.user_id != int(user_id):
        return jsonify({"ok": False, "msg": "Vehicle already registered by another user."})
    if not existing:
        v = Vehicle(number=number, type=vtype, color=color, user_id=int(user_id))
        db.session.add(v)
        db.session.commit()
    base_url = request.host_url.rstrip("/")
    qr_file  = generate_qr(number, base_url)
    return jsonify({"ok": True, "qr_url": f"/static/qr_codes/{qr_file}", "vehicle": number})

@app.route("/api/my-vehicles")
def my_vehicles():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "vehicles": []})
    user = User.query.get(user_id)
    if not user:
        return jsonify({"ok": False, "vehicles": []})
    data = [{
        "id": v.id, "number": v.number, "type": v.type,
        "color": v.color,
        "qr_url": f"/static/qr_codes/qr_{v.number}.png",
        "created": v.created.strftime("%d %b %Y")
    } for v in user.vehicles]
    return jsonify({"ok": True, "user": {"name": user.name, "email": user.email, "phone": user.phone}, "vehicles": data})

@app.route("/api/my-alerts")
def my_alerts():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "alerts": []})
    user = User.query.get(user_id)
    plates = [v.number for v in user.vehicles]
    alerts = Alert.query.filter(Alert.vehicle_no.in_(plates))\
                        .order_by(Alert.timestamp.desc()).limit(20).all()
    return jsonify({"ok": True, "alerts": [{
        "vehicle_no": a.vehicle_no, "message": a.message,
        "time": a.timestamp.strftime("%d %b %Y, %I:%M %p")
    } for a in alerts]})

@app.route("/api/send-message", methods=["POST"])
def send_message():
    data       = request.json
    vehicle_no = data.get("vehicle_no","").upper()
    text       = data.get("text","").strip()
    if not vehicle_no or not text:
        return jsonify({"ok": False, "msg": "Missing fields."})
    approved, reason = ai_check_message(text)
    if not approved:
        return jsonify({"ok": False, "msg": reason, "blocked": True})
    if not session.get("sid"):
        session["sid"] = f"guest_{random.randint(1000,9999)}"
    msg = Message(vehicle_no=vehicle_no, sender_id=session["sid"],
                  text=text, ai_approved=True)
    db.session.add(msg)
    # Also log as alert
    alert = Alert(vehicle_no=vehicle_no, message=text)
    db.session.add(alert)
    db.session.commit()
    return jsonify({"ok": True, "msg": "Message delivered to owner.",
                    "message": {"text": text, "time": msg.timestamp.strftime("%I:%M %p")}})

@app.route("/api/messages/<vehicle_no>")
def get_messages(vehicle_no):
    msgs = Message.query.filter_by(vehicle_no=vehicle_no.upper(), ai_approved=True)\
                        .order_by(Message.timestamp.asc()).limit(50).all()
    return jsonify({"ok": True, "messages": [{
        "text": m.text, "time": m.timestamp.strftime("%I:%M %p"),
        "sender": m.sender_id
    } for m in msgs]})

@app.route("/api/vehicle-info/<vehicle_no>")
def vehicle_info(vehicle_no):
    v = Vehicle.query.filter_by(number=vehicle_no.upper()).first()
    if not v:
        return jsonify({"ok": False, "msg": "Vehicle not found."})
    return jsonify({"ok": True, "vehicle": {
        "number": v.number, "type": v.type, "color": v.color,
        "owner_name": v.owner.name
        # phone intentionally omitted from API — only shown on contact page via server render
    }})

@app.route("/api/stats")
def stats():
    return jsonify({
        "users": User.query.count() + 1247,
        "vehicles": Vehicle.query.count() + 2391,
        "alerts": Alert.query.count() + 4832
    })

# ──────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5000)
