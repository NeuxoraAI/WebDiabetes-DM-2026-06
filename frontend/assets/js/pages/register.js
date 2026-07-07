import { register } from "../api/auth.js";
import { saveSession, getToken } from "../api/client.js";
import { redirectByRole } from "../utils/auth-guard.js";

if (getToken()) redirectByRole();

const form = document.getElementById("register-form");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");
const patientFields = document.getElementById("patient-fields");
const doctorFields = document.getElementById("doctor-fields");

function currentRole() {
  return form.querySelector('input[name="role"]:checked').value;
}

function syncSelected(selector) {
  form.querySelectorAll(selector).forEach((label) => {
    label.classList.toggle("selected", label.querySelector("input").checked);
  });
}

function updateRoleUI() {
  const isPatient = currentRole() === "patient";
  patientFields.classList.toggle("hidden", !isPatient);
  doctorFields.classList.toggle("hidden", isPatient);
  syncSelected(".role-option");
}

form.querySelectorAll('input[name="role"]').forEach((radio) =>
  radio.addEventListener("change", updateRoleUI)
);
form.querySelectorAll('input[name="sex"]').forEach((radio) =>
  radio.addEventListener("change", () => syncSelected(".sex-option"))
);
updateRoleUI();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");
  if (!form.reportValidity()) return;

  const role = currentRole();
  const payload = {
    full_name: form.full_name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    role,
  };

  if (role === "patient") {
    const sex = form.querySelector('input[name="sex"]:checked');
    if (!form.birth_date.value || !sex) {
      errorEl.textContent = "Indica tu fecha de nacimiento y sexo.";
      errorEl.classList.remove("hidden");
      return;
    }
    payload.birth_date = form.birth_date.value;
    payload.sex = sex.value;
  } else {
    if (!form.cedula.value.trim()) {
      errorEl.textContent = "Indica tu cédula profesional.";
      errorEl.classList.remove("hidden");
      return;
    }
    payload.cedula_profesional = form.cedula.value.trim();
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creando cuenta…";
  try {
    const session = await register(payload);
    saveSession(session);
    redirectByRole();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    submitBtn.disabled = false;
    submitBtn.textContent = "Crear cuenta";
  }
});
