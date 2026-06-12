import { getInbox } from "../api/doctor.js";
import { renderNav, setNavBadge } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { requireRole } from "../utils/auth-guard.js";
import { formatDateTime } from "../utils/date-format.js";

if (!requireRole("doctor")) throw new Error("redirigiendo");

renderNav("doctor", "inbox");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

async function init() {
  const inbox = await getInbox();
  setNavBadge(inbox.length);
  const list = document.getElementById("inbox-list");
  document.getElementById("inbox-empty").classList.toggle("hidden", inbox.length > 0);
  // Ya vienen ordenados del más antiguo al más reciente (PRD §5.3)
  list.innerHTML = inbox
    .map(
      (m) => `
    <a href="/doctor/patient-detail.html?id=${m.patient_id}#chat"
       class="neu-card-sm flex items-center gap-4 p-5 no-underline row-link" style="border-radius:24px">
      <div style="width:46px;height:46px;border-radius:50%;background:var(--ink);display:grid;place-items:center;color:#fff;font-weight:900;font-size:15px;flex-shrink:0">${initials(m.patient_name)}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between gap-3 mb-0.5">
          <span style="font-weight:900;color:var(--ink)">${m.patient_name}</span>
          <span class="text-xs font-bold shrink-0" style="color:var(--muted)">${formatDateTime(m.sent_at)}</span>
        </div>
        <p class="m-0 text-sm font-bold truncate" style="color:var(--muted)">${escapeHtml(m.content)}</p>
      </div>
    </a>`
    )
    .join("");
}

init().catch((err) => showToast(err.message, "error"));
