import { formatShortDate } from "../utils/date-format.js";
import { SCORE_MAX, SCORE_MIN } from "../utils/adherence-labels.js";
import { softChartOptions } from "./chart-theme.js";

let chartInstance = null;

export function renderAdherenceChart(canvas, history) {
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map((h) => formatShortDate(h.answered_at)),
      datasets: [
        {
          label: "Puntaje de adherencia",
          data: history.map((h) => h.score),
          borderColor: "#ee5366",
          backgroundColor: "rgba(238, 83, 102, 0.14)",
          fill: true,
          tension: 0.4,
          borderWidth: 3.5,
          pointRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#ee5366",
          pointBorderWidth: 3,
          pointHoverRadius: 7,
        },
      ],
    },
    options: softChartOptions({
      yMin: SCORE_MIN,
      yMax: SCORE_MAX,
      afterLabel: (ctx) => `Etapa: ${history[ctx.dataIndex].stage}`,
    }),
  });
  return chartInstance;
}
