# 🅿 ParkBridge — How to Run in VS Code

## 📁 Project Structure

```
ParkBridge/
|
├── app.py                  ← Flask backend (main file)
├── requirements.txt        ← Python packages
├── parkbridge.db           ← SQLite DB (auto-created on first run)
│
├── static/
│   ├── css/
│   │   └── style.css       ← Shared styles for all pages
│   ├── js/
│   │   ├── bg.js           ← Animated background (city, rain, radar)
│   │   ├── main.js         ← Home/Register/Dashboard logic
│   │   └── contact.js      ← Contact page chat + AI filter
│   └── qr_codes/           ← Generated QR images saved here
│
└── templates/
    ├── index.html          ← Home + Register + Dashboard (SPA)
    ├── contact.html        ← Contact page (QR scan destination)
    ├── not_found.html      ← Vehicle not found page
    └── base.html           ← (Reference — not directly used)
```

---

## ✅ Step-by-Step Setup in VS Code

### STEP 1 — Install Python
- Download Python 3.11+ from https://python.org
- During install, tick **"Add Python to PATH"**
- Verify: open Terminal → type `python --version`

---

### STEP 2 — Open Project in VS Code
1. Open VS Code
2. File → Open Folder → select the **ParkBridge** folder
3. VS Code will detect it

---

### STEP 3 — Open Terminal in VS Code
- Press **Ctrl + `** (backtick) to open Terminal
- Or go to: Terminal → New Terminal

---

### STEP 4 — Create Virtual Environment
```bash
python -m venv venv
```

Activate it:
- **Windows:**  `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

You should see **(venv)** at the start of the terminal line.

---

### STEP 5 — Install Dependencies
```bash
pip install -r requirements.txt
```

This installs: Flask, Flask-SQLAlchemy, qrcode, Pillow

---

### STEP 6 — Run the App
```bash
python app.py
```

You will see:
```
* Running on http://127.0.0.1:5000
* Running on http://0.0.0.0:5000
```

---

### STEP 7 — Open in Browser
- Go to: **http://localhost:5000**
- The website is running!

---

### STEP 8 — Test QR Code on Phone

To test QR codes on your actual phone:

1. Find your computer's local IP address:
   - Windows: run `ipconfig` in terminal → look for **IPv4 Address** (e.g. `192.168.1.5`)
   - Mac: run `ifconfig | grep inet`

2. On your phone (connected to same WiFi), open browser:
   ```
   http://192.168.1.5:5000
   ```

3. Register a vehicle → download QR → scan with phone camera
   → It will open `http://192.168.1.5:5000/contact/YOUR_PLATE`

---

## 🧪 Quick Test Flow

1. Open http://localhost:5000
2. Click **Register**
3. Fill name, phone, email → Send OTP
4. Enter the demo OTP shown on screen
5. Add vehicle number (e.g. `MH12AB3456`)
6. QR Code pops up → Download it
7. Open **http://localhost:5000/contact/MH12AB3456** in a new tab
8. You see the contact page with Call, SMS, and Chat
9. Type a parking-related message → it delivers
10. Type an off-topic message → AI blocks it

---

## 🔧 Useful VS Code Extensions to Install

| Extension | Purpose |
|-----------|---------|
| Python (Microsoft) | Python support |
| Pylance | Type hints |
| Flask Snippets | Flask shortcuts |
| SQLite Viewer | View the database |

---

## 🌐 For Production (Going Live)

To make it accessible on the internet:

1. Deploy to **PythonAnywhere** (free tier): https://pythonanywhere.com
2. Or deploy to **Railway**: https://railway.app
3. Change `app.secret_key` to a long random string
4. Set `debug=False` in `app.run()`
5. Configure your real SMS API (Fast2SMS or Twilio) in `app.py`

---

## 📱 SMS Integration (Fast2SMS)

In `app.py`, replace the OTP print line with:
```python
import requests
requests.post("https://www.fast2sms.com/dev/bulkV2", headers={
    "authorization": "YOUR_API_KEY"
}, data={
    "route": "v3",
    "sender_id": "TXTIND",
    "message": f"Your ParkBridge OTP is {otp}",
    "language": "english",
    "flash": 0,
    "numbers": phone
})
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again |
| Port already in use | Change `port=5000` to `port=5001` in app.py |
| QR not generating | Install Pillow: `pip install Pillow` |
| Font error in QR | Ignore — falls back to default font automatically |
| Phone can't access | Make sure phone and PC are on same WiFi |

---

Made with ❤️ — ParkBridge 2025
