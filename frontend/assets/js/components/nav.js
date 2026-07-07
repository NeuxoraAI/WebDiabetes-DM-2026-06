import { getName } from "../api/client.js";
import { logout } from "../utils/auth-guard.js";

const HEART = `<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 21s-7.5-4.7-9.8-9A5.6 5.6 0 0 1 12 6.3 5.6 5.6 0 0 1 21.8 12c-2.3 4.3-9.8 9-9.8 9z"/></svg>`;

function icon(name, color) {
  const p = `width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const shapes = {
    home: `<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>`,
    quiz: `<circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/>`,
    msg: `<path d="M21 11.5a8.38 8.38 0 0 1-9 8.35 9 9 0 0 1-3.5-.65L3 21l1.8-4.5A8.38 8.38 0 1 1 21 11.5z"/>`,
    inbox: `<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z"/>`,
    patients: `<circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-6 7-6s7 2.1 7 6"/><path d="M16 11c2.2 0 6 1.1 6 5"/><circle cx="16.5" cy="6.5" r="3"/>`,
    exit: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  };
  return `<svg ${p}>${shapes[name] || ""}</svg>`;
}

const NAV_ITEMS = {
  patient: [
    { id: "home", label: "Inicio", href: "/patient/dashboard.html", ic: "home" },
    { id: "quiz", label: "Cuestionario", href: "/patient/questionnaire.html", ic: "quiz" },
    { id: "msg", label: "Mensajes", href: "/patient/chat.html", ic: "msg", badge: true },
  ],
  doctor: [
    { id: "patients", label: "Pacientes", href: "/doctor/dashboard.html", ic: "patients" },
    { id: "inbox", label: "Buzón", href: "/doctor/inbox.html", ic: "inbox", badge: true },
  ],
};

// Renderiza el header de escritorio y la nav inferior móvil dentro de #app-nav.
// Devuelve nada; el badge se actualiza después con setNavBadge(n).
export function renderNav(role, active) {
  const container = document.getElementById("app-nav");
  if (!container) return;
  const items = NAV_ITEMS[role] || [];
  const name = getName() || "";
  const initial = name.trim().charAt(0).toUpperCase() || "•";
  const subtitle = role === "doctor" ? "Panel médico" : "Diabetes tipo 2";

  const pills = items
    .map((it) => {
      const act = it.id === active;
      return `
      <a href="${it.href}" class="neu-pill ${act ? "active" : ""}">
        ${icon(it.ic, act ? "#ffffff" : "#7d8fa9")}
        ${it.label}
        ${it.badge ? `<span data-nav-badge class="neu-badge" style="display:none"></span>` : ""}
      </a>`;
    })
    .join("");

  const mobileItems = items
    .map((it) => {
      const act = it.id === active;
      return `
      <a href="${it.href}" class="${act ? "active" : ""}">
        ${icon(it.ic, act ? "#ee5366" : "#8c9cb5")}
        ${it.label}
        ${it.badge ? `<span data-nav-badge class="neu-badge" style="display:none;position:absolute;top:0;right:9px"></span>` : ""}
      </a>`;
    })
    .join("");

  container.innerHTML = `
    <header class="max-w-6xl mx-auto px-5 pt-6 pb-1 flex items-center gap-5 flex-wrap">
      <a href="${items[0]?.href || "/"}" class="flex items-center gap-3 mr-auto no-underline">
        <div class="neu-logo">${HEART}</div>
        <div>
          <div style="font-weight:900;font-size:17px;color:var(--ink);line-height:1.15">Mi Registro</div>
          <div style="font-size:12.5px;font-weight:700;color:var(--muted)">${subtitle}</div>
        </div>
      </a>
      <nav class="neu-pill-group hidden sm:flex">${pills}</nav>
      <div class="hidden sm:flex items-center gap-3">
        <div class="neu-avatar" title="${name}">${initial}</div>
        <button id="nav-logout" class="bg-transparent border-none cursor-pointer font-extrabold"
          style="color:var(--muted);font-size:14px">Salir</button>
      </div>
    </header>
    <nav class="mobile-nav sm:hidden">
      ${mobileItems}
      <button id="nav-logout-m">${icon("exit", "#8c9cb5")}Salir</button>
    </nav>`;

  container.querySelectorAll("#nav-logout, #nav-logout-m").forEach((btn) =>
    btn.addEventListener("click", logout)
  );
}

export function setNavBadge(count) {
  document.querySelectorAll("[data-nav-badge]").forEach((el) => {
    if (count > 0) {
      el.textContent = count;
      el.style.display = "inline-block";
    } else {
      el.style.display = "none";
    }
  });
}
