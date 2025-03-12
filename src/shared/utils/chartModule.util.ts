/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import fs from "node:fs";
import path from "node:path";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { ChartConfiguration, Chart, ChartDataset } from "chart.js";

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 800;

const chartCallback = (ChartJS: typeof Chart): void => {
  const chart = ChartJS;
  chart.defaults.font.family = "Arial";
  chart.defaults.font.size = 14;

  chart.defaults.plugins.datalabels = {
    display: false,
    clamp: true,
  };
};

const canvas = new ChartJSNodeCanvas({
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
  chartCallback,
  backgroundColour: "white",
  plugins: {
    modern: [ChartDataLabels],
  },
});

async function generateLineChart({
  fileName,
  labels,
  title,
  datasets,
  outputDir,
}: {
  fileName: string;
  title: string;
  labels: number[];
  datasets: ChartDataset[];
  outputDir: string;
}) {
  const configuration: ChartConfiguration = {
    type: "line" as const,
    data: {
      labels,
      datasets,
    },
    options: {
      layout: {
        padding: {
          right: 40,
        },
      },
      plugins: {
        title: {
          text: title || "Performance Chart",
          display: true,
        },
      },
      responsive: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Time (seconds)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Percentage (%)",
          },
          suggestedMin: 0,
          suggestedMax: 100,
        },
      },
    },
  };

  const image = await canvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, fileName), image);
}

export { generateLineChart as generateChart };
