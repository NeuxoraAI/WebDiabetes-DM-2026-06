import { formatShortDate } from "../utils/date-format.js";
import { softChartOptions } from "./chart-theme.js";

// Color propio por variable clínica (paleta de la propuesta UX)
export const CLINICAL_FIELDS = [
  { key: "weight", label: "Peso", unit: "kg", color: "#ee5366" },
  { key: "waist_cm", label: "Cintura", unit: "cm", color: "#e8a13c" },
  { key: "height_cm", label: "Estatura", unit: "cm", color: "#8c9cb5" },
  { key: "glucose", label: "Glucosa", unit: "mg/dL", color: "#2bb795" },
  { key: "hba1c", label: "HbA1c", unit: "%", color: "#8b7ef0" },
  { key: "body_fat_pct", label: "Grasa corporal", unit: "%", color: "#4a9de8" },
  { key: "gestas", label: "Gestas", unit: "", color: "#e8833c" },
];

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

let chartInstance = null;

export function renderClinicalChart(canvas, records, fieldKey) {
  const field = CLINICAL_FIELDS.find((f) => f.key === fieldKey) || CLINICAL_FIELDS[0];
  const points = records.filter((r) => r[fieldKey] !== null && r[fieldKey] !== undefined);
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: points.map((r) => formatShortDate(r.recorded_at)),
      datasets: [
        {
          label: field.unit ? `${field.label} (${field.unit})` : field.label,
          data: points.map((r) => Number(r[fieldKey])),
          borderColor: field.color,
          backgroundColor: hexToRgba(field.color, 0.14),
          fill: true,
          tension: 0.4,
          borderWidth: 3.5,
          pointRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: field.color,
          pointBorderWidth: 3,
          pointHoverRadius: 7,
        },
      ],
    },
    options: softChartOptions(),
  });
  return chartInstance;
}
