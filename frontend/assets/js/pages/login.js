import { login } from "../api/auth.js";
import { saveSession, getToken } from "../api/client.js";
import { redirectByRole } from "../utils/auth-guard.js";

if (getToken()) redirectByRole();

const form = document.getElementById("login-form");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");
  if (!form.reportValidity()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando…";
  try {
    const session = await login(form.email.value.trim(), form.password.value);
    saveSession(session);
    redirectByRole();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});
