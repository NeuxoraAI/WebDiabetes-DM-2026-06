export function showToast(message, type = "info") {
  const colors = {
    info: "linear-gradient(135deg, #6aaef0, #4a9de8)",
    success: "linear-gradient(135deg, #36c89b, #1fa97c)",
    error: "linear-gradient(135deg, #f98a7b, #ee5366)",
    warning: "linear-gradient(135deg, #f0b35c, #e8833c)",
  };
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-20 sm:bottom-5 right-4 z-50 flex flex-col gap-2";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.style.background = colors[type] || colors.info;
  toast.className =
    "text-white px-5 py-3.5 rounded-2xl shadow-lg text-sm font-bold max-w-sm transition-opacity duration-300";
  toast.style.boxShadow = "8px 8px 20px rgba(120, 140, 170, 0.45)";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
