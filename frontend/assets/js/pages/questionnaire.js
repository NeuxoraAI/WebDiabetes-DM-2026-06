import { getName } from "../api/client.js";
import { getMe, getQuestions, submitQuestionnaire } from "../api/patient.js";
import { renderNav, setNavBadge } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { SCORE_MAX, SCORE_MIN, stageBadge } from "../utils/adherence-labels.js";
import { requireRole } from "../utils/auth-guard.js";
import { formatDate } from "../utils/date-format.js";

if (!requireRole("patient")) throw new Error("redirigiendo");

renderNav("patient", "quiz");

const TOTAL = 29;
const loading = document.getElementById("loading");
const welcomeScreen = document.getElementById("welcome-screen");
const questionnaireScreen = document.getElementById("questionnaire-screen");
const resultScreen = document.getElementById("result-screen");
const container = document.getElementById("questions-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

let definition = null;

async function init() {
  const isWelcome = new URLSearchParams(window.location.search).has("bienvenida");
  const [me, def] = await Promise.all([getMe(), getQuestions()]);
  definition = def;
  setNavBadge(me.unread_messages);
  loading.classList.add("hidden");

  if (isWelcome || me.adherence.is_new_user) {
    document.getElementById("welcome-name").textContent = getName().split(/\s+/)[0] || "";
    document.getElementById("welcome-sex").textContent =
      me.sex === "F" ? "Sexo: Mujer" : "Sexo: Hombre";
    welcomeScreen.classList.remove("hidden");
    document.getElementById("start-btn").addEventListener("click", () => {
      welcomeScreen.classList.add("hidden");
      showQuestionnaire();
    });
  } else {
    showQuestionnaire();
  }
}

function showQuestionnaire() {
  container.innerHTML = definition.questions
    .map(
      (q) => `
    <fieldset class="neu-card-sm p-5 border-none m-0" data-question="${q.number}">
      <legend class="sr-only">Pregunta ${q.number}</legend>
      <p class="mt-0 mb-3.5 font-bold" style="color:var(--body)">
        <span style="color:var(--accent);font-weight:900">${q.number}.</span> ${q.text}
      </p>
      <div class="flex flex-wrap gap-2.5">
        ${definition.options
          .map(
            (o) => `
          <label class="answer-option">
            <input type="radio" name="q${q.number}" value="${o.value}" class="sr-only" />
            ${o.label}
          </label>`
          )
          .join("")}
      </div>
    </fieldset>`
    )
    .join("");

  container.addEventListener("change", (e) => {
    if (e.target.type !== "radio") return;
    const fieldset = e.target.closest("fieldset");
    fieldset.querySelectorAll(".answer-option").forEach((label) => {
      label.classList.toggle("selected", label.querySelector("input").checked);
    });
    updateProgress();
  });

  questionnaireScreen.classList.remove("hidden");
}

function answeredCount() {
  let count = 0;
  for (let i = 1; i <= TOTAL; i++) {
    if (document.querySelector(`input[name="q${i}"]:checked`)) count++;
  }
  return count;
}

function updateProgress() {
  const count = answeredCount();
  progressText.textContent = `${count} de ${TOTAL}`;
  progressBar.style.width = `${(count / TOTAL) * 100}%`;
}

function buildRing(pct) {
  const r = 52;
  const C = 2 * Math.PI * r;
  return `
  <svg viewBox="0 0 130 130" style="width:110px;height:110px">
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="11"/>
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 65 65)"
      style="transition:stroke-dashoffset .8s ease"/>
    <text x="65" y="72" text-anchor="middle" font-size="27" font-weight="900" fill="#ffffff" font-family="Nunito, sans-serif">${pct}%</text>
  </svg>`;
}

document.getElementById("questionnaire-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("error");
  errorEl.classList.add("hidden");

  const answers = [];
  const missing = [];
  for (let i = 1; i <= TOTAL; i++) {
    const checked = document.querySelector(`input[name="q${i}"]:checked`);
    if (checked) answers.push(parseInt(checked.value, 10));
    else missing.push(i);
  }
  if (missing.length > 0) {
    errorEl.textContent = `El cuestionario debe responderse completo. Faltan los ítems: ${missing.join(", ")}.`;
    errorEl.classList.remove("hidden");
    document
      .querySelector(`fieldset[data-question="${missing[0]}"]`)
      .scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";
  try {
    const result = await submitQuestionnaire(answers);
    questionnaireScreen.classList.add("hidden");
    const pct = Math.round(((result.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100);
    document.getElementById("result-score").textContent = result.score;
    document.getElementById("result-ring").innerHTML = buildRing(pct);
    document.getElementById("result-stage").innerHTML = stageBadge(result.stage);
    document.getElementById("result-description").textContent = result.stage_description;
    document.getElementById("result-date").textContent = formatDate(result.answered_at);
    document.getElementById("result-next").textContent = formatDate(result.next_due_date);
    resultScreen.classList.remove("hidden");
    window.scrollTo({ top: 0 });
  } catch (err) {
    showToast(err.message, "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar cuestionario";
  }
});

init().catch((err) => {
  loading.textContent = "Error al cargar: " + err.message;
});
