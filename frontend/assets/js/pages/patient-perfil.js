import { getMe, updateMe } from "../api/patient.js";
import { changePassword } from "../api/auth.js";
import { setStoredName } from "../api/client.js";
import { renderNav } from "../components/nav.js";
import { showToast } from "../components/toast.js";
import { requireRole } from "../utils/auth-guard.js";

if (!requireRole("patient")) throw new Error("redirigiendo");
renderNav("patient", "perfil");

const profileForm = document.getElementById("profile-form");
const passwordForm = document.getElementById("password-form");
const profileError = document.getElementById("profile-error");
const passwordError = document.getElementById("password-error");
const profileBtn = document.getElementById("profile-btn");
const passwordBtn = document.getElementById("password-btn");
const emailInput = document.getElementById("email");
const emailConfirm = document.getElementById("email-confirm");
const currentPasswordInput = document.getElementById("current_password");

let me = null;

function syncSelected() {
  profileForm.querySelectorAll(".sex-option").forEach((label) => {
    label.classList.toggle("selected", label.querySelector("input").checked);
  });
}

// Muestra el campo de contraseña actual solo cuando el correo cambia.
function updateEmailConfirm() {
  const changed = emailInput.value.trim() !== me.email;
  emailConfirm.classList.toggle("hidden", !changed);
  currentPasswordInput.required = changed;
  if (!changed) currentPasswordInput.value = "";
}

async function init() {
  me = await getMe();
  profileForm.full_name.value = me.full_name;
  emailInput.value = me.email;
  profileForm.birth_date.value = me.birth_date; // ISO YYYY-MM-DD
  const sexRadio = profileForm.querySelector(`input[name="sex"][value="${me.sex}"]`);
  if (sexRadio) sexRadio.checked = true;
  syncSelected();

  profileForm.querySelectorAll('input[name="sex"]').forEach((radio) =>
    radio.addEventListener("change", syncSelected)
  );
  emailInput.addEventListener("input", updateEmailConfirm);

  document.getElementById("loading").classList.add("hidden");
  document.getElementById("content").classList.remove("hidden");
}

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  profileError.classList.add("hidden");
  if (!profileForm.reportValidity()) return;

  const payload = {};
  const fullName = profileForm.full_name.value.trim();
  const email = emailInput.value.trim();
  const birthDate = profileForm.birth_date.value;
  const sex = profileForm.querySelector('input[name="sex"]:checked')?.value;

  if (fullName !== me.full_name) payload.full_name = fullName;
  if (email !== me.email) {
    payload.email = email;
    payload.current_password = currentPasswordInput.value;
  }
  if (birthDate !== me.birth_date) payload.birth_date = birthDate;
  if (sex && sex !== me.sex) payload.sex = sex;

  if (Object.keys(payload).length === 0) {
    profileError.textContent = "No hay cambios que guardar.";
    profileError.classList.remove("hidden");
    return;
  }

  profileBtn.disabled = true;
  profileBtn.textContent = "Guardando…";
  try {
    const updated = await updateMe(payload);
    const nameChanged = updated.full_name !== me.full_name;
    me = updated;
    if (nameChanged) {
      setStoredName(updated.full_name);
      renderNav("patient", "perfil");
    }
    updateEmailConfirm();
    showToast("Datos actualizados", "success");
  } catch (err) {
    profileError.textContent = err.message;
    profileError.classList.remove("hidden");
  } finally {
    profileBtn.disabled = false;
    profileBtn.textContent = "Guardar cambios";
  }
});

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  passwordError.classList.add("hidden");
  if (!passwordForm.reportValidity()) return;

  passwordBtn.disabled = true;
  passwordBtn.textContent = "Actualizando…";
  try {
    await changePassword(passwordForm.pw_current.value, passwordForm.pw_new.value);
    passwordForm.reset();
    showToast("Contraseña actualizada", "success");
  } catch (err) {
    passwordError.textContent = err.message;
    passwordError.classList.remove("hidden");
  } finally {
    passwordBtn.disabled = false;
    passwordBtn.textContent = "Actualizar contraseña";
  }
});

init().catch((err) => {
  document.getElementById("loading").textContent = err.message || "Error al cargar";
});
