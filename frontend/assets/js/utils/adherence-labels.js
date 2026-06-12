// Mapeo etapa → clase de badge (rojo → verde, ver neuro.css)
const STAGE_CLASSES = {
  "Precontemplación": "stage-precontemplacion",
  "Contemplación": "stage-contemplacion",
  "Preparación": "stage-preparacion",
  "Acción": "stage-accion",
  "Mantenimiento": "stage-mantenimiento",
};

export function stageBadge(stage) {
  if (!stage) return '<span class="stage-none">Sin cuestionario</span>';
  const cls = STAGE_CLASSES[stage] || "stage-none";
  return `<span class="stage-badge ${cls}">${stage}</span>`;
}

export const SCORE_MIN = 29;
export const SCORE_MAX = 145;
