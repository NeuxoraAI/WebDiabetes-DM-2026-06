import { clearSession, getRole, getToken } from "../api/client.js";

export function requireRole(role) {
  const token = getToken();
  if (!token || getRole() !== role) {
    clearSession();
    window.location.href = "/index.html";
    return false;
  }
  return true;
}

export function redirectByRole() {
  const role = getRole();
  if (role === "patient") window.location.href = "/patient/dashboard.html";
  else if (role === "doctor") window.location.href = "/doctor/dashboard.html";
}

export function logout() {
  clearSession();
  window.location.href = "/index.html";
}
