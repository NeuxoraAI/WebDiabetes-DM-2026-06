import { getMe, getMessages, sendMessage } from "../api/patient.js";
import { renderNav } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { requireRole } from "../utils/auth-guard.js";
import { formatDateTime } from "../utils/date-format.js";

if (!requireRole("patient")) throw new Error("redirigiendo");

renderNav("patient", "msg");

const POLL_INTERVAL_MS = 30000; // PRD §6.2: polling cada 30 segundos

const thread = document.getElementById("thread");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let lastCount = -1;

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderThread(messages) {
  if (messages.length === lastCount) return;
  lastCount = messages.length;
  if (messages.length === 0) {
    thread.innerHTML = `<p class="text-center py-12 m-0 font-bold" style="color:var(--muted)">
      Aún no hay mensajes. Escribe tu primera pregunta a tu médico.</p>`;
    return;
  }
  const bubbles = messages
    .map((m) => {
      const mine = m.sender_role === "patient";
      return `
      <div class="flex ${mine ? "justify-end" : "justify-start"}">
        <div class="${mine ? "bubble-mine" : "bubble-theirs"}" style="max-width:80%;padding:13px 17px;font-size:15px;font-weight:600;line-height:1.5">
          <p class="m-0 whitespace-pre-wrap break-words">${escapeHtml(m.content)}</p>
          <div class="text-right mt-1.5" style="font-size:11.5px;font-weight:700;color:${mine ? "rgba(255,255,255,.8)" : "#93a3ba"}">
            ${formatDateTime(m.sent_at)}${mine && m.replied_at ? " · Respondido" : ""}
          </div>
        </div>
      </div>`;
    })
    .join("");
  thread.innerHTML = bubbles;
  thread.scrollTop = thread.scrollHeight;
}

async function refresh() {
  try {
    const messages = await getMessages();
    renderThread(messages);
  } catch {
    /* el polling reintenta en el siguiente ciclo */
  }
}

async function init() {
  const me = await getMe();
  if (!me.has_doctor) {
    document.getElementById("no-doctor-notice").classList.remove("hidden");
    input.disabled = true;
    sendBtn.disabled = true;
    input.placeholder = "Disponible cuando tu médico te acepte";
    return;
  }
  if (me.doctor_name) {
    document.getElementById("doctor-name").textContent = me.doctor_name;
    const initials = me.doctor_name
      .replace(/^Dra?\.\s*/i, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
    document.getElementById("doctor-avatar").textContent = initials || "🩺";
  }
  await refresh();
  setInterval(refresh, POLL_INTERVAL_MS);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = input.value.trim();
  if (!content) return;
  sendBtn.disabled = true;
  try {
    await sendMessage(content);
    input.value = "";
    lastCount = -1;
    await refresh();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    sendBtn.disabled = false;
  }
});

init().catch((err) => showToast(err.message, "error"));
