const TOKEN_KEY = "dm2_token";
const ROLE_KEY = "dm2_role";
const NAME_KEY = "dm2_name";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function getName() {
  return localStorage.getItem(NAME_KEY);
}

export function saveSession({ access_token, role, full_name }) {
  localStorage.setItem(TOKEN_KEY, access_token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(NAME_KEY, full_name);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    window.location.href = "/index.html";
    throw new ApiError("Sesión expirada", 401);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let detail = data && data.detail ? data.detail : "Error en el servidor";
    if (Array.isArray(detail)) {
      detail = detail.map((e) => e.msg || JSON.stringify(e)).join("; ");
    }
    throw new ApiError(detail, res.status);
  }
  return data;
}
