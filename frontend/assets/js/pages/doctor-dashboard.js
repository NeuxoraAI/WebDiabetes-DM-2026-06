import { getName } from "../api/client.js";
import {
  addPatient,
  getInbox,
  getMyPatients,
  getRegisteredPatients,
} from "../api/doctor.js";
import { renderNav, setNavBadge } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { stageBadge } from "../utils/adherence-labels.js";
import { requireRole } from "../utils/auth-guard.js";
import { formatDate, formatDateTime } from "../utils/date-format.js";

if (!requireRole("doctor")) throw new Error("redirigiendo");

renderNav("doctor", "patients");

document.getElementById("greeting").textContent = `¡Hola, ${getName() || ""}!`;
document.getElementById("today-line").textContent =
  "Hoy es " +
  new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) +
  " · Este es el estado de tus pacientes";

const searchInput = document.getElementById("search");
let myPatients = [];
let registered = [];

function matchesSearch(name) {
  const q = searchInput.value.trim().toLowerCase();
  return !q || name.toLowerCase().includes(q);
}

function renderMyPatients() {
  const rows = myPatients.filter((p) => matchesSearch(p.full_name));
  const tbody = document.getElementById("my-patients-table");
  tbody.innerHTML = rows
    .map(
      (p) => `
    <tr class="row-link" onclick="window.location.href='/doctor/patient-detail.html?id=${p.patient_id}'">
      <td style="font-weight:900;color:var(--accent)">${p.full_name}</td>
      <td>
        ${stageBadge(p.latest_stage)}
        ${p.latest_score !== null ? `<span style="color:var(--muted);margin-left:6px">(${p.latest_score})</span>` : ""}
      </td>
      <td style="color:var(--muted)">${p.latest_clinical_at ? formatDateTime(p.latest_clinical_at) : "—"}</td>
      <td>
        ${
          p.unanswered_messages > 0
            ? `<span class="neu-badge" style="font-size:12px;padding:3px 10px">${p.unanswered_messages}</span>`
            : `<span style="color:var(--muted)">0</span>`
        }
      </td>
    </tr>`
    )
    .join("");
  document.getElementById("my-patients-empty").classList.toggle("hidden", rows.length > 0);
}

function renderRegistered() {
  const rows = registered.filter((p) => matchesSearch(p.full_name));
  const tbody = document.getElementById("registered-table");
  tbody.innerHTML = rows
    .map(
      (p) => `
    <tr>
      <td style="font-weight:900;color:var(--ink)">${p.full_name}</td>
      <td style="color:var(--muted)">${formatDate(p.registered_at)}</td>
      <td>${p.sex === "F" ? "Mujer" : "Hombre"}</td>
      <td>${stageBadge(p.latest_stage)}</td>
      <td class="text-right">
        ${
          p.has_doctor
            ? `<span class="text-xs font-bold" style="color:var(--muted)">Ya tiene médico asignado</span>`
            : `<button data-add="${p.patient_id}" class="neu-btn-primary text-xs px-4 py-2" style="border-radius:999px">Agregar a mi lista</button>`
        }
      </td>
    </tr>`
    )
    .join("");
  document.getElementById("registered-empty").classList.toggle("hidden", rows.length > 0);

  const pendingCount = registered.filter((p) => !p.has_doctor).length;
  const countEl = document.getElementById("registered-count");
  countEl.textContent = pendingCount;
  countEl.style.display = pendingCount > 0 ? "inline-block" : "none";

  tbody.querySelectorAll("button[data-add]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await addPatient(parseInt(btn.dataset.add, 10));
        showToast("Paciente agregado a tu lista.", "success");
        await loadData();
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
      }
    })
  );
}

function setTab(tab) {
  document.getElementById("tab-my-patients").classList.toggle("hidden", tab !== "my-patients");
  document.getElementById("tab-registered").classList.toggle("hidden", tab !== "registered");
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
}

document.querySelectorAll(".tab-btn").forEach((btn) =>
  btn.addEventListener("click", () => setTab(btn.dataset.tab))
);

searchInput.addEventListener("input", () => {
  renderMyPatients();
  renderRegistered();
});

async function loadData() {
  const [mine, reg, inbox] = await Promise.all([
    getMyPatients(),
    getRegisteredPatients(),
    getInbox(),
  ]);
  myPatients = mine;
  registered = reg;
  renderMyPatients();
  renderRegistered();
  setNavBadge(inbox.length);
}

loadData().catch((err) => showToast(err.message, "error"));
