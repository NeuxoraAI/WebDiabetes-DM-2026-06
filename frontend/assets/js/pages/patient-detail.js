import {
  addPatientClinical,
  getInbox,
  getPatientAdherence,
  getPatientClinical,
  getPatientDetail,
  getPatientMessages,
  replyPatient,
} from "../api/doctor.js";
import { renderAdherenceChart } from "../components/chart-adherence.js";
import { CLINICAL_FIELDS, renderClinicalChart } from "../components/chart-clinical.js";
import { renderNav, setNavBadge } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { stageBadge } from "../utils/adherence-labels.js";
import { requireRole } from "../utils/auth-guard.js";
import { formatDate, formatDateTime } from "../utils/date-format.js";

if (!requireRole("doctor")) throw new Error("redirigiendo");

renderNav("doctor", "patients");

const patientId = parseInt(new URLSearchParams(window.location.search).get("id"), 10);
if (!patientId) window.location.href = "/doctor/dashboard.html";

const POLL_INTERVAL_MS = 30000;

let detail = null;
let adherenceHistory = [];
let clinicalRecords = [];
let activeMetric = "weight";
let lastMsgCount = -1;

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- Tabs ---------- */
function setTab(tab) {
  ["summary", "adherence", "clinical", "chat"].forEach((t) => {
    document.getElementById(`tab-${t}`).classList.toggle("hidden", t !== tab);
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  if (tab === "adherence" && adherenceHistory.length > 0) {
    renderAdherenceChart(document.getElementById("adherence-chart"), adherenceHistory);
  }
  if (tab === "clinical") renderClinicalChartSection();
}

document.querySelectorAll(".tab-btn").forEach((btn) =>
  btn.addEventListener("click", () => setTab(btn.dataset.tab))
);

/* ---------- Resumen ---------- */
function renderSummary() {
  const rows = [
    ["Nombre", detail.full_name],
    ["Correo", detail.email],
    ["Sexo", detail.sex === "F" ? "Mujer" : "Hombre"],
    ["Fecha de nacimiento", formatDate(detail.birth_date)],
    ["Registro en plataforma", formatDate(detail.registered_at)],
    [
      "Adherencia actual",
      detail.latest_stage
        ? `${stageBadge(detail.latest_stage)} <span style="color:var(--muted)">(${detail.latest_score} pts · ${formatDate(detail.latest_questionnaire_at)})</span>`
        : '<span class="stage-none">Sin cuestionario</span>',
    ],
  ];
  document.getElementById("summary-content").innerHTML = rows
    .map(
      ([label, value]) => `
    <div class="py-3" style="border-bottom:1px solid rgba(163,177,198,.3)">
      <p class="m-0 text-xs uppercase tracking-wide font-extrabold" style="color:var(--muted)">${label}</p>
      <p class="mt-1 mb-0 font-extrabold" style="color:var(--body)">${value}</p>
    </div>`
    )
    .join("");

  const alerts = [];
  if (detail.questionnaire_due) {
    alerts.push("El paciente tiene pendiente su cuestionario mensual de adherencia.");
  }
  if (!detail.latest_stage) {
    alerts.push("El paciente aún no ha respondido ningún cuestionario.");
  }
  document.getElementById("summary-alerts").innerHTML = alerts
    .map((a) => `<div class="notice-amber px-5 py-3.5 text-sm">⚠️ ${a}</div>`)
    .join("");
}

/* ---------- Adherencia ---------- */
function renderAdherenceTable() {
  const tbody = document.getElementById("adherence-table");
  tbody.innerHTML = [...adherenceHistory]
    .reverse()
    .map(
      (q) => `
    <tr>
      <td>${formatDateTime(q.answered_at)}</td>
      <td style="font-weight:900;color:var(--ink)">${q.score}</td>
      <td>${stageBadge(q.stage)}</td>
    </tr>`
    )
    .join("");
  document
    .getElementById("adherence-empty")
    .classList.toggle("hidden", adherenceHistory.length > 0);
}

/* ---------- Datos clínicos ---------- */
function visibleFields() {
  return CLINICAL_FIELDS.filter((f) => detail.sex === "F" || f.key !== "gestas");
}

function renderChips() {
  const chipsEl = document.getElementById("metric-chips");
  chipsEl.innerHTML = visibleFields()
    .map(
      (f) =>
        `<button type="button" class="neu-chip ${f.key === activeMetric ? "active" : ""}" data-metric="${f.key}">${f.label}</button>`
    )
    .join("");
  chipsEl.querySelectorAll("[data-metric]").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeMetric = btn.dataset.metric;
      renderChips();
      renderClinicalChartSection();
    })
  );
}

function renderClinicalChartSection() {
  const field = CLINICAL_FIELDS.find((f) => f.key === activeMetric);
  document.getElementById("clinical-chart-title").textContent =
    `Evolución · ${field.label}${field.unit ? ` (${field.unit})` : ""}`;
  const hasData = clinicalRecords.some(
    (r) => r[activeMetric] !== null && r[activeMetric] !== undefined
  );
  document.getElementById("clinical-chart").classList.toggle("hidden", !hasData);
  document.getElementById("clinical-chart-empty").classList.toggle("hidden", hasData);
  if (hasData && !document.getElementById("tab-clinical").classList.contains("hidden")) {
    renderClinicalChart(document.getElementById("clinical-chart"), clinicalRecords, activeMetric);
  }
}

function renderClinicalTable() {
  const isFemale = detail.sex === "F";
  document.querySelectorAll(".gestas-col").forEach((el) =>
    el.classList.toggle("hidden", !isFemale)
  );
  const fmt = (v) => (v === null || v === undefined ? "—" : Number(v));
  const tbody = document.getElementById("clinical-table");
  tbody.innerHTML = [...clinicalRecords]
    .reverse()
    .map(
      (r) => `
    <tr>
      <td class="whitespace-nowrap">${formatDateTime(r.recorded_at)}</td>
      <td>${fmt(r.weight)}</td>
      <td>${fmt(r.waist_cm)}</td>
      <td>${fmt(r.height_cm)}</td>
      <td>${fmt(r.glucose)}</td>
      <td>${fmt(r.hba1c)}</td>
      <td>${fmt(r.body_fat_pct)}</td>
      ${isFemale ? `<td>${fmt(r.gestas)}</td>` : ""}
      <td style="color:var(--muted)">${r.recorded_by_role === "doctor" ? "🩺 " : ""}${r.recorded_by_name}</td>
    </tr>`
    )
    .join("");
  document
    .getElementById("clinical-empty")
    .classList.toggle("hidden", clinicalRecords.length > 0);
}

document.getElementById("clinical-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const record = {};
  for (const { key } of CLINICAL_FIELDS) {
    const input = form.elements[key];
    if (input && input.value !== "") {
      record[key] = key === "gestas" ? parseInt(input.value, 10) : parseFloat(input.value);
    }
  }
  if (Object.keys(record).length === 0) {
    showToast("Captura al menos un dato clínico.", "warning");
    return;
  }
  try {
    await addPatientClinical(patientId, record);
    form.reset();
    clinicalRecords = await getPatientClinical(patientId);
    renderClinicalTable();
    renderClinicalChartSection();
    showToast("Registro clínico guardado.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
});

/* ---------- Chat ---------- */
function renderThread(messages) {
  if (messages.length === lastMsgCount) return;
  lastMsgCount = messages.length;
  const thread = document.getElementById("thread");
  if (messages.length === 0) {
    thread.innerHTML = `<p class="text-center py-12 m-0 font-bold" style="color:var(--muted)">Sin mensajes con este paciente.</p>`;
    return;
  }
  thread.innerHTML = messages
    .map((m) => {
      const mine = m.sender_role === "doctor";
      return `
      <div class="flex ${mine ? "justify-end" : "justify-start"}">
        <div class="${mine ? "bubble-mine" : "bubble-theirs"}" style="max-width:80%;padding:13px 17px;font-size:15px;font-weight:600;line-height:1.5">
          <p class="m-0 whitespace-pre-wrap break-words">${escapeHtml(m.content)}</p>
          <div class="text-right mt-1.5" style="font-size:11.5px;font-weight:700;color:${mine ? "rgba(255,255,255,.8)" : "#93a3ba"}">${formatDateTime(m.sent_at)}</div>
        </div>
      </div>`;
    })
    .join("");
  thread.scrollTop = thread.scrollHeight;
}

async function refreshChat() {
  try {
    renderThread(await getPatientMessages(patientId));
  } catch {
    /* reintenta en el siguiente ciclo */
  }
}

document.getElementById("message-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  const content = input.value.trim();
  if (!content) return;
  const sendBtn = document.getElementById("send-btn");
  sendBtn.disabled = true;
  try {
    await replyPatient(patientId, content);
    input.value = "";
    lastMsgCount = -1;
    await refreshChat();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    sendBtn.disabled = false;
  }
});

/* ---------- Init ---------- */
function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

async function init() {
  [detail, adherenceHistory, clinicalRecords] = await Promise.all([
    getPatientDetail(patientId),
    getPatientAdherence(patientId),
    getPatientClinical(patientId),
  ]);

  document.getElementById("patient-avatar").textContent = initials(detail.full_name);
  document.getElementById("patient-title").textContent = detail.full_name;
  document.getElementById("patient-subtitle").textContent =
    `${detail.sex === "F" ? "Mujer" : "Hombre"} · Nació el ${formatDate(detail.birth_date)}`;
  document.getElementById("gestas-field").classList.toggle("hidden", detail.sex !== "F");

  renderSummary();
  renderAdherenceTable();
  renderChips();
  renderClinicalTable();
  await refreshChat();
  setInterval(refreshChat, POLL_INTERVAL_MS);

  getInbox()
    .then((inbox) => setNavBadge(inbox.length))
    .catch(() => {});

  document.getElementById("loading").classList.add("hidden");
  document.getElementById("content").classList.remove("hidden");

  if (window.location.hash === "#chat") setTab("chat");
}

init().catch((err) => {
  document.getElementById("loading").textContent = "Error al cargar: " + err.message;
});
