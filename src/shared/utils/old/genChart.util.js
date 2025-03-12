// generateCharts.js
const fs = require("node:fs");
const { parse } = require("csv-parse");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const path = require("node:path");

// Arrays to hold parsed data
const counts = [];
const hostCpu = [];
const hostMemoryUsedPercentage = [];
const workerCpu = [];
const workerMemoryUsedPercentage = [];
const activeProcessingCount = [];

// Create the parser
const parser = parse({
  columns: true,
  skip_empty_lines: true
});

// Read and parse the CSV file
fs.createReadStream(path.resolve(process.cwd(), 'experiments', '2025-03-12-12-10-33@1', 'w1.csv'))
  .pipe(parser)
  .on("data", row => {
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
  .on("error", err => {
    console.error("Error parsing CSV:", err);
  });


// Function to generate a line chart given x and y data arrays
async function generateLineChart(
  xData,
  yData,
  yAxisLabel,
  chartTitle,
  outputFilename,
) {
  const width = 800; // image width in pixels
  const height = 600; // image height in pixels

  // Optional: customize global chart defaults if desired
  const chartCallback = ChartJS => {
    ChartJS.defaults.font.family = "Arial";
    ChartJS.defaults.font.size = 14;
  };

  // Create a new chart instance
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    chartCallback,
  });

  const configuration = {
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
