/* ════════════════════════════════════════
   PARKBRIDGE — Contact / Chat Page JS
   ════════════════════════════════════════ */

const VEHICLE_NO = document.getElementById("vehicle-no-data")?.dataset.vehicle || "";
const SESSION_ID = document.getElementById("session-id-data")?.dataset.sid || "guest";

/* ── TOAST ── */
function toast(msg, type = "s") {
  const d = document.createElement("div");
  d.className = `toast ${type}`;
  d.innerHTML = `<span>${type === "s" ? "✅" : "⚠️"}</span>${msg}`;
  document.getElementById("toasts").appendChild(d);
  setTimeout(() => d.remove(), 4300);
}

/* ── CHAT FUNCTIONS ── */
function renderMessage(msg, isSelf) {
  const wrap = document.getElementById("chat-messages");
  const div  = document.createElement("div");
  div.style.cssText = `display:flex;flex-direction:column;align-items:${isSelf ? "flex-end" : "flex-start"};margin-bottom:14px;animation:msgIn .3s ease;`;
  div.innerHTML = `
    <div style="
      max-width:78%;padding:12px 16px;border-radius:${isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
      background:${isSelf ? "linear-gradient(135deg,rgba(0,255,231,.15),rgba(124,58,237,.1))" : "rgba(0,0,0,.35)"};
      border:1px solid ${isSelf ? "rgba(0,255,231,.2)" : "rgba(255,255,255,.06)"};
      font-family:var(--font-c);font-size:.9rem;line-height:1.5;color:var(--text);">
      ${escHtml(msg.text)}
    </div>
    <div style="font-family:var(--font-d);font-size:.56rem;letter-spacing:.08em;color:var(--dim);margin-top:4px;">${msg.time}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ── SEND MESSAGE ── */
function sendMessage() {
  const input  = document.getElementById("msg-input");
  const text   = input.value.trim();
  const errBox = document.getElementById("ai-error");
  if (!text) return;

  // disable button while sending
  const btn = document.getElementById("send-btn");
  btn.disabled = true; btn.textContent = "Sending…";

  fetch("/api/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicle_no: VEHICLE_NO, text })
  }).then(r => r.json()).then(d => {
    btn.disabled = false; btn.textContent = "Send";
    if (d.ok) {
      renderMessage(d.message, true);
      input.value = "";
      errBox.classList.add("hidden");
      toast("Alert delivered to owner.");
    } else {
      // AI blocked the message
      errBox.textContent = "⚠ Message not delivered — " + d.msg;
      errBox.classList.remove("hidden");
      // shake input
      input.classList.add("shake");
      setTimeout(() => input.classList.remove("shake"), 600);
    }
  }).catch(() => {
    btn.disabled = false; btn.textContent = "Send";
    errBox.textContent = "⚠ Could not connect. Please try again.";
    errBox.classList.remove("hidden");
  });
}

/* ── CALL / SMS BUTTONS ── */
window.doCall = function (phone) {
  window.location.href = "tel:" + phone;
};
window.doSMS = function (phone) {
  window.location.href = "sms:" + phone + "?body=Hi, your vehicle " + VEHICLE_NO + " is blocking my car. Please move it.";
};

/* ── ENTER KEY ── */
document.getElementById("msg-input")?.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

document.getElementById("send-btn")?.addEventListener("click", sendMessage);

/* ── AUTO REFRESH MESSAGES ── */
function refreshMessages() {
  fetch(`/api/messages/${VEHICLE_NO}`)
    .then(r => r.json())
    .then(d => {
      const wrap = document.getElementById("chat-messages");
      // Only update if count changed
      const current = wrap.querySelectorAll("[data-msg-id]").length;
      if (d.messages.length > current) {
        // Clear and re-render all (simple approach)
        wrap.innerHTML = "";
        d.messages.forEach(m => renderMessage(m, m.sender === SESSION_ID));
      }
    });
}

// Refresh every 10s
setInterval(refreshMessages, 10000);
