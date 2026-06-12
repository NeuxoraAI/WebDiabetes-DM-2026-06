// Tema compartido para Chart.js acorde al sistema de diseño neumórfico

export function softChartOptions({ yMin, yMax, afterLabel } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: yMin,
        max: yMax,
        grid: { color: "rgba(195, 208, 226, 0.55)", drawTicks: false },
        border: { display: false, dash: [2, 6] },
        ticks: {
          color: "#90a1ba",
          font: { family: "'Nunito', sans-serif", weight: 700, size: 12 },
          padding: 10,
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "#90a1ba",
          font: { family: "'Nunito', sans-serif", weight: 700, size: 12 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 9,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#33415a",
        titleFont: { family: "'Nunito', sans-serif", weight: 700, size: 12 },
        bodyFont: { family: "'Nunito', sans-serif", weight: 800, size: 14 },
        padding: 12,
        cornerRadius: 13,
        displayColors: false,
        callbacks: afterLabel ? { afterLabel } : {},
      },
    },
  };
}
