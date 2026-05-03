/* ════════════════════════════════════════
   PARKBRIDGE — Index Page JS
   ════════════════════════════════════════ */

/* ── TOAST ── */
function toast(msg, type = "s") {
  const d = document.createElement("div");
  d.className = `toast ${type}`;
  d.innerHTML = `<span>${type === "s" ? "✅" : "⚠️"}</span>${msg}`;
  document.getElementById("toasts").appendChild(d);
  setTimeout(() => d.remove(), 4300);
}

/* ── MODAL ── */
const openModal  = id => document.getElementById(id).classList.add("open");
const closeModal = id => document.getElementById(id).classList.remove("open");
window.openModal  = openModal;
window.closeModal = closeModal;

/* ── PAGE SWITCHER ── */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("page-" + id).classList.add("active");
  document.querySelectorAll(`.nav-btn[data-pg="${id}"]`).forEach(b => b.classList.add("active"));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "dashboard") renderDash();
  if (id === "home") setTimeout(animStats, 300);
}
window.showPage = showPage;

/* ── STATS ── */
let statsRan = false;
function animStats() {
  if (statsRan) return; statsRan = true;
  fetch("/api/stats").then(r => r.json()).then(d => {
    countUp("sn1", d.users);
    countUp("sn2", d.vehicles);
    countUp("sn3", d.alerts);
  }).catch(() => {
    countUp("sn1", 1247); countUp("sn2", 2391); countUp("sn3", 4832);
  });
}
function countUp(id, target) {
  let v = 0; const el = document.getElementById(id);
  if (!el) return;
  const step = Math.ceil(target / 60);
  const iv = setInterval(() => {
    v = Math.min(v + step, target);
    el.textContent = v.toLocaleString("en-IN");
    if (v >= target) clearInterval(iv);
  }, 25);
}

/* ── FLOATING HERO TAGS ── */
const TAGS = ["QR SCAN","ALERT SENT","PRIVACY ON","VEHICLE FOUND","OWNER NOTIFIED","SECURE","PROTECTED","SMART PARKING","NO CONFLICTS","INSTANT ALERT","INDIA 🇮🇳","ZERO CONFLICT"];
(function buildTags() {
  const ht = document.getElementById("hero-tags");
  if (!ht) return;
  TAGS.forEach(t => {
    const el = document.createElement("div"); el.className = "htag"; el.textContent = t;
    el.style.cssText = `left:${4 + Math.random() * 88}%;animation-duration:${14 + Math.random() * 20}s;animation-delay:${-Math.random() * 25}s;`;
    ht.appendChild(el);
  });
})();

/* ── STEPS ── */
function goStep(n) {
  [1, 2, 3].forEach(i => document.getElementById("s" + i).classList.add("hidden"));
  document.getElementById("s" + n).classList.remove("hidden");
  ["sc1","sc2","sc3"].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove("active","done");
    if (i + 1 < n) el.classList.add("done");
    if (i + 1 === n) el.classList.add("active");
  });
  ["sl1","sl2"].forEach((id, i) => document.getElementById(id).classList.toggle("done", i + 1 < n));
}
window.goStep = goStep;

/* ── REGISTER ── */
let currentUser = null;

window.doSendOTP = function () {
  const name  = document.getElementById("r-name").value.trim();
  const phone = document.getElementById("r-phone").value.trim();
  const email = document.getElementById("r-email").value.trim();
  if (!name || !phone || !email) { toast("Please fill all fields.", "e"); return; }
  fetch("/api/send-otp", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, email })
  }).then(r => r.json()).then(d => {
    if (!d.ok) { toast(d.msg, "e"); return; }
    document.getElementById("otp-ph").textContent = phone;
    document.getElementById("otp-hint").textContent = "Demo OTP: " + d.demo_otp;
    window._pending_phone = phone;
    goStep(2);
    document.getElementById("o0").focus();
    toast("OTP sent to " + phone);
  });
};

window.oNext = function (el, i) { if (el.value.length === 1 && i < 5) document.getElementById("o" + (i + 1)).focus(); };
window.oPrev = function (e, i) { if (e.key === "Backspace" && !e.target.value && i > 0) document.getElementById("o" + (i - 1)).focus(); };

window.doVerifyOTP = function () {
  const otp = [0,1,2,3,4,5].map(i => document.getElementById("o"+i).value).join("");
  fetch("/api/verify-otp", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: window._pending_phone, otp })
  }).then(r => r.json()).then(d => {
    if (!d.ok) { toast(d.msg, "e"); return; }
    currentUser = d.user;
    goStep(3); toast("Identity verified! ✅");
  });
};

window.doAddVehicle = function () {
  const number = document.getElementById("v-num").value.trim().toUpperCase();
  const type   = document.getElementById("v-type").value;
  const color  = document.getElementById("v-color").value.trim() || "—";
  if (!number || number.length < 4) { toast("Enter a valid plate number.", "e"); return; }
  fetch("/api/register-vehicle", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number, type, color, user_id: currentUser?.id })
  }).then(r => r.json()).then(d => {
    if (!d.ok) { toast(d.msg, "e"); return; }
    toast("Vehicle registered! Opening QR code…");
    setTimeout(() => showQRModal(number, d.qr_url), 600);
  });
};

/* ── QR MODAL ── */
function showQRModal(plate, qrUrl) {
  document.getElementById("qr-plate").textContent = plate;
  const img = document.getElementById("qr-img");
  img.src = qrUrl; img.alt = "QR Code for " + plate;
  openModal("modal-qr");
}
window.showQRModal = showQRModal;

window.dlQR = function () {
  const link = document.createElement("a");
  link.href = document.getElementById("qr-img").src;
  link.download = "parkbridge-" + document.getElementById("qr-plate").textContent + ".png";
  link.click(); toast("QR Code downloaded!");
};

/* ── DASHBOARD ── */
function renderDash() {
  fetch("/api/my-vehicles").then(r => r.json()).then(d => {
    if (!d.ok) {
      document.getElementById("dash-sub").textContent = "Please register to access your dashboard.";
      document.getElementById("dash-vehicles").innerHTML = '<p class="text-mid" style="font-family:var(--font-c);padding:20px;text-align:center;">No account found. <button class="btn btn-ghost btn-sm" onclick="showPage(\'register\')">Register →</button></p>';
      return;
    }
    document.getElementById("dash-sub").textContent = `Welcome back, ${d.user.name}`;
    document.getElementById("dash-info").innerHTML = `
      <div style="display:grid;gap:10px;">
        <div style="display:flex;gap:8px;align-items:center;"><span style="width:52px;font-family:var(--font-d);font-size:.58rem;color:var(--dim);">NAME</span><strong>${d.user.name}</strong></div>
        <div style="display:flex;gap:8px;align-items:center;"><span style="width:52px;font-family:var(--font-d);font-size:.58rem;color:var(--dim);">PHONE</span><strong class="text-neon mono">${d.user.phone}</strong></div>
        <div style="display:flex;gap:8px;align-items:center;"><span style="width:52px;font-family:var(--font-d);font-size:.58rem;color:var(--dim);">EMAIL</span><strong>${d.user.email}</strong></div>
      </div>`;
    document.getElementById("ds-v").textContent = d.vehicles.length;
    document.getElementById("dash-vehicles").innerHTML = d.vehicles.length
      ? d.vehicles.map(v => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:rgba(0,0,0,.3);border-radius:14px;border:1px solid rgba(0,255,231,.08);margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="plate" style="font-size:.88rem;padding:6px 12px;letter-spacing:3px;">${v.number}</div>
            <div>
              <div style="font-family:var(--font-d);font-size:.72rem;">${v.type}</div>
              <div style="font-family:var(--font-c);font-size:.76rem;color:var(--dim);">${v.color} · ${v.created}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="showQRModal('${v.number}','${v.qr_url}')">📱 QR</button>
        </div>`).join("")
      : '<p class="text-mid" style="font-family:var(--font-c);padding:20px;text-align:center;">No vehicles. <button class="btn btn-ghost btn-sm" onclick="showPage(\'register\')">Add →</button></p>';
  });

  fetch("/api/my-alerts").then(r => r.json()).then(d => {
    document.getElementById("ds-a").textContent = d.alerts?.length || 0;
    document.getElementById("dash-alerts").innerHTML = d.alerts?.length
      ? d.alerts.map(a => `
        <div style="display:flex;gap:14px;padding:18px;border-radius:14px;border:1px solid rgba(255,77,106,.2);background:rgba(255,77,106,.05);margin-bottom:10px;">
          <div style="font-size:1.5rem;">🚨</div>
          <div>
            <div style="font-family:var(--font-d);font-size:.82rem;margin-bottom:4px;">${a.vehicle_no}</div>
            <div style="font-family:var(--font-d);font-size:.58rem;color:var(--dim);">${a.time}</div>
            <div style="margin-top:8px;font-family:var(--font-c);font-size:.83rem;color:var(--mid);background:rgba(0,0,0,.25);padding:8px 12px;border-radius:8px;border-left:2px solid var(--neon2);">${a.message}</div>
          </div>
        </div>`).join("")
      : '<p class="text-mid" style="font-family:var(--font-c);padding:20px;text-align:center;">🟢 No alerts yet.</p>';
  });
}

/* ── INIT ── */
animStats();
