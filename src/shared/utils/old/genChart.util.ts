// generateCharts.ts
import fs from "node:fs";
import { parse } from "csv-parse";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import path from "node:path";
import { ChartConfiguration, Chart } from "chart.js";

interface CsvRow {
  Count: string;
  Host_CPU: string;
  Host_Memory_UsedPercentage: string;
  Worker_CPU: string;
  Worker_Memory_UsedPercentage: string;
  ActiveProcessingCount: string;
}

// Arrays to hold parsed data
const counts: number[] = [];
const hostCpu: number[] = [];
const hostMemoryUsedPercentage: number[] = [];
const workerCpu: number[] = [];
const workerMemoryUsedPercentage: number[] = [];
const activeProcessingCount: number[] = [];

// Function to generate a line chart given x and y data arrays
async function generateLineChart(
  xData: number[],
  yData: number[],
  yAxisLabel: string,
  chartTitle: string,
  outputFilename: string,
): Promise<void> {
  const width = 800; // image width in pixels
  const height = 600; // image height in pixels

  // Optional: customize global chart defaults if desired
  const chartCallback = (ChartJS: typeof Chart): void => {
    const chart = ChartJS;
    chart.defaults.font.family = "Arial";
    chart.defaults.font.size = 14;
  };

  // Create a new chart instance
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    chartCallback,
  });

  const configuration: ChartConfiguration = {
    type: "line",
    data: {
      labels: xData,
      datasets: [
        {
          label: yAxisLabel,
          data: yData,
          fill: false,
          borderColor: "blue",
          backgroundColor: "transparent",
          tension: 0.1,
          pointRadius: 3,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: chartTitle,
          font: { size: 18 },
        },
        legend: {
          display: true,
        },
      },
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
            text: yAxisLabel,
          },
        },
      },
    },
  };

  try {
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync(outputFilename, imageBuffer);
    console.log(`Chart saved as ${outputFilename}`);
  } catch (err) {
    console.error(`Error generating chart ${outputFilename}:`, err);
  }
}

// Create the parser
const parser = parse({
  columns: true,
  skip_empty_lines: true,
});

// Read and parse the CSV file
fs.createReadStream(
  path.resolve(process.cwd(), "experiments", "2025-03-12-02-15-57@1", "w1.csv"),
)
  .pipe(parser)
  .on("data", (row: CsvRow) => {
    // Parse values to float for numeric charts
    counts.push(parseFloat(row.Count));
    hostCpu.push(parseFloat(row.Host_CPU));
    hostMemoryUsedPercentage.push(parseFloat(row.Host_Memory_UsedPercentage));
    workerCpu.push(parseFloat(row.Worker_CPU));
    workerMemoryUsedPercentage.push(
      parseFloat(row.Worker_Memory_UsedPercentage),
    );
    activeProcessingCount.push(parseFloat(row.ActiveProcessingCount));
  })
  .on("end", async () => {
    console.log("CSV file successfully processed.");
    // Generate the charts one by one
    await generateLineChart(
      counts,
      hostCpu,
      "Host CPU Usage (%)",
      "Host CPU Usage",
      "host_cpu_chart.png",
    );
    await generateLineChart(
      counts,
      hostMemoryUsedPercentage,
      "Host Memory Used (%)",
      "Host Memory Usage",
      "host_memory_chart.png",
    );
    await generateLineChart(
      counts,
      workerCpu,
      "Worker CPU Usage (%)",
      "Worker CPU Usage",
      "worker_cpu_chart.png",
    );
    await generateLineChart(
      counts,
      workerMemoryUsedPercentage,
      "Worker Memory Used (%)",
      "Worker Memory Usage",
      "worker_memory_chart.png",
    );
    await generateLineChart(
      counts,
      activeProcessingCount,
      "Active Processing Count",
      "Active Processing Count",
      "active_processing_chart.png",
    );
  })
  .on("error", (err: Error) => {
    console.error("Error parsing CSV:", err);
  });
