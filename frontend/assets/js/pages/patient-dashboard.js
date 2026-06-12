import { getName } from "../api/client.js";
import {
  addClinicalRecord,
  getAdherenceHistory,
  getClinicalHistory,
  getMe,
} from "../api/patient.js";
import { renderAdherenceChart } from "../components/chart-adherence.js";
import { CLINICAL_FIELDS, renderClinicalChart } from "../components/chart-clinical.js";
import { renderNav, setNavBadge } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { SCORE_MAX, SCORE_MIN, stageBadge } from "../utils/adherence-labels.js";
import { requireRole } from "../utils/auth-guard.js";
import { formatDate, formatDateTime, formatShortDate } from "../utils/date-format.js";

if (!requireRole("patient")) throw new Error("redirigiendo");

renderNav("patient", "home");

let me = null;
let clinicalRecords = [];
let activeMetric = "weight";

function firstName() {
  return (getName() || "").trim().split(/\s+/)[0] || "";
}

function todayLabel() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function buildRing(pct, sublabel) {
  const r = 52;
  const C = 2 * Math.PI * r;
  return `
  <svg viewBox="0 0 130 130" style="width:118px;height:118px;flex-shrink:0">
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="11"/>
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 65 65)"
      style="transition:stroke-dashoffset .8s ease"/>
    <text x="65" y="62" text-anchor="middle" font-size="27" font-weight="900" fill="#ffffff" font-family="Nunito, sans-serif">${pct}%</text>
    <text x="65" y="83" text-anchor="middle" font-size="12" font-weight="700" fill="rgba(255,255,255,.85)" font-family="Nunito, sans-serif">${sublabel}</text>
  </svg>`;
}

async function init() {
  me = await getMe();

  // Nuevo usuario: flujo de bienvenida + primer cuestionario (PRD §4.1)
  if (me.adherence.is_new_user) {
    window.location.href = "/patient/questionnaire.html?bienvenida=1";
    return;
  }

  renderHeader();
  await renderAdherence();
  await renderClinical();

  document.getElementById("loading").classList.add("hidden");
  document.getElementById("content").classList.remove("hidden");
}

function renderHeader() {
  setNavBadge(me.unread_messages);
  document.getElementById("greeting").textContent = `¡Hola, ${firstName()}!`;
  const phrase = me.adherence.questionnaire_due
    ? "Es buen momento para tu cuestionario mensual"
    : "Vas muy bien, sigue así";
  document.getElementById("today-line").textContent = `Hoy es ${todayLabel()} · ${phrase}`;

  if (!me.has_doctor) {
    document.getElementById("no-doctor-notice").classList.remove("hidden");
  }
  if (me.adherence.questionnaire_due) {
    document.getElementById("due-text").textContent =
      `Han pasado ${me.adherence.days_since_last} días desde tu último cuestionario. ` +
      "Realiza tu cuestionario mensual para un seguimiento preciso.";
    document.getElementById("due-banner").classList.remove("hidden");
  }
}

async function renderAdherence() {
  const latest = me.adherence.latest;
  const pct = Math.round(((latest.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100);

  document.getElementById("hero-score").innerHTML =
    `${latest.score}<span style="font-size:24px;font-weight:800;opacity:.85"> pts</span>`;
  document.getElementById("hero-msg").textContent = latest.stage_description;
  document.getElementById("hero-ring").innerHTML = buildRing(pct, "de 145 pts");

  const history = await getAdherenceHistory();
  const stats = [
    { label: "Etapa actual", html: stageBadge(latest.stage) },
    { label: "Cuestionarios", html: `<span style="font-size:26px;font-weight:900;color:var(--ink)">${history.length}</span>` },
    { label: "Último realizado", html: `<span style="font-size:16px;font-weight:900;color:var(--ink)">${formatDate(latest.answered_at)}</span>` },
    { label: "Próximo sugerido", html: `<span style="font-size:16px;font-weight:900;color:var(--green)">${formatDate(latest.next_due_date)}</span>` },
  ];
  document.getElementById("stat-cards").innerHTML = stats
    .map(
      (s) => `
    <div class="neu-card-sm px-5 py-4 flex flex-col justify-center gap-1.5">
      <div style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${s.label}</div>
      <div>${s.html}</div>
    </div>`
    )
    .join("");

  if (history.length > 0) {
    const first = formatShortDate(history[0].answered_at);
    const last = formatShortDate(history[history.length - 1].answered_at);
    document.getElementById("adherence-range").textContent =
      history.length > 1 ? `${first} – ${last}` : first;
  }
  renderAdherenceChart(document.getElementById("adherence-chart"), history);
}

/* ---------- Datos clínicos ---------- */
function visibleFields() {
  return CLINICAL_FIELDS.filter((f) => me.sex === "F" || f.key !== "gestas");
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
  if (hasData) {
    renderClinicalChart(document.getElementById("clinical-chart"), clinicalRecords, activeMetric);
  }
}

function renderClinicalTable() {
  const tbody = document.getElementById("clinical-table");
  const empty = document.getElementById("clinical-empty");
  const isFemale = me.sex === "F";
  document.querySelectorAll(".gestas-col").forEach((el) =>
    el.classList.toggle("hidden", !isFemale)
  );
  const fmt = (v) => (v === null || v === undefined ? "—" : Number(v));
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
  empty.classList.toggle("hidden", clinicalRecords.length > 0);
}

async function renderClinical() {
  document.getElementById("gestas-field").classList.toggle("hidden", me.sex !== "F");
  clinicalRecords = await getClinicalHistory();
  renderChips();
  renderClinicalTable();
  renderClinicalChartSection();
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
    await addClinicalRecord(record);
    form.reset();
    clinicalRecords = await getClinicalHistory();
    renderClinicalTable();
    renderClinicalChartSection();
    showToast("¡Registro guardado! Tu gráfica ya se actualizó.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
});

init().catch((err) => {
  document.getElementById("loading").textContent = "Error al cargar: " + err.message;
});
