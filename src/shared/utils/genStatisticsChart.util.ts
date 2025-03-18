/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { generateChart } from "./chartModule.util";

type CsvKeys =
  | "Count"
  | "ActiveProcessingCount_mean"
  | "ActiveProcessingCount_median"
  | "ActiveProcessingCount_std_dev"
  | "ActiveProcessingCount_mode"
  | "Host_CPU_mean"
  | "Host_CPU_median"
  | "Host_CPU_std_dev"
  | "Host_CPU_mode"
  | "Host_Memory_Total_mean"
  | "Host_Memory_Total_median"
  | "Host_Memory_Total_std_dev"
  | "Host_Memory_Total_mode"
  | "Host_Memory_Used_mean"
  | "Host_Memory_Used_median"
  | "Host_Memory_Used_std_dev"
  | "Host_Memory_Used_mode"
  | "Host_Memory_UsedPercentage_mean"
  | "Host_Memory_UsedPercentage_median"
  | "Host_Memory_UsedPercentage_std_dev"
  | "Host_Memory_UsedPercentage_mode"
  | "Worker_CPU_mean"
  | "Worker_CPU_median"
  | "Worker_CPU_std_dev"
  | "Worker_CPU_mode"
  | "Worker_Memory_Total_mean"
  | "Worker_Memory_Total_median"
  | "Worker_Memory_Total_std_dev"
  | "Worker_Memory_Total_mode"
  | "Worker_Memory_Used_mean"
  | "Worker_Memory_Used_median"
  | "Worker_Memory_Used_std_dev"
  | "Worker_Memory_Used_mode"
  | "Worker_Memory_UsedPercentage_mean"
  | "Worker_Memory_UsedPercentage_median"
  | "Worker_Memory_UsedPercentage_std_dev"
  | "Worker_Memory_UsedPercentage_mode"
  | `Processing_CPU_${number}_mean`
  | `Processing_CPU_${number}_median`
  | `Processing_CPU_${number}_std_dev`
  | `Processing_CPU_${number}_mode`
  | `Processing_Memory_Total_${number}_mean`
  | `Processing_Memory_Total_${number}_median`
  | `Processing_Memory_Total_${number}_std_dev`
  | `Processing_Memory_Total_${number}_mode`
  | `Processing_Memory_Used_${number}_mean`
  | `Processing_Memory_Used_${number}_median`
  | `Processing_Memory_Used_${number}_std_dev`
  | `Processing_Memory_Used_${number}_mode`
  | `Processing_Memory_UsedPercentage_${number}_mean`
  | `Processing_Memory_UsedPercentage_${number}_median`
  | `Processing_Memory_UsedPercentage_${number}_std_dev`
  | `Processing_Memory_UsedPercentage_${number}_mode`;
const PHASE_COUNT = 3;

// New interface for statistics data
interface StatisticsData {
  Count: number[];
  ActiveProcessingCount: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Host_CPU: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Host_Memory_Used: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Host_Memory_UsedPercentage: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Worker_CPU: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Worker_Memory_Used: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Worker_Memory_UsedPercentage: {
    mean: number[];
    median: number[];
    std_dev: number[];
    mode: number[];
  };
  Processing: {
    [key: string]: {
      CPU: {
        mean: number[];
        median: number[];
        std_dev: number[];
        mode: number[];
      };
      Memory_Used: {
        mean: number[];
        median: number[];
        std_dev: number[];
        mode: number[];
      };
      Memory_UsedPercentage: {
        mean: number[];
        median: number[];
        std_dev: number[];
        mode: number[];
      };
    };
  };
}

const generateDataLabelsComparison = ({
  values,
  currentValue,
  currentIndex,
}: {
  values: number[];
  currentValue: number;
  currentIndex: number;
}) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const firstMinOccurrence = values.indexOf(min);
  const firstMaxOccurrence = values.indexOf(max);
  return (
    (currentValue.toFixed(2) === max.toFixed(2) ||
      currentValue.toFixed(2) === min.toFixed(2)) &&
    (currentIndex === firstMinOccurrence || currentIndex === firstMaxOccurrence)
  );
};

async function validateAndParseStatisticsCsv({
  csvPath,
}: {
  csvPath: string;
}): Promise<StatisticsData> {
  if (!fs.existsSync(csvPath)) {
    throw new Error("CSV file not found");
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    cast: (value, context) => {
      if (String(context.column) === "Count") return parseInt(value, 10);
      if (String(context.column).includes("_")) return parseFloat(value) || 0;
      return value;
    },
  });

  const data: StatisticsData = {
    Count: [],
    ActiveProcessingCount: { mean: [], median: [], std_dev: [], mode: [] },
    Host_CPU: { mean: [], median: [], std_dev: [], mode: [] },
    Host_Memory_Used: { mean: [], median: [], std_dev: [], mode: [] },
    Host_Memory_UsedPercentage: { mean: [], median: [], std_dev: [], mode: [] },
    Worker_CPU: { mean: [], median: [], std_dev: [], mode: [] },
    Worker_Memory_Used: { mean: [], median: [], std_dev: [], mode: [] },
    Worker_Memory_UsedPercentage: {
      mean: [],
      median: [],
      std_dev: [],
      mode: [],
    },
    Processing: {},
  };

  // Initialize processing data structure
  for (let i = 1; i <= PHASE_COUNT; i += 1) {
    data.Processing[`Processing_${i}`] = {
      CPU: { mean: [], median: [], std_dev: [], mode: [] },
      Memory_Used: { mean: [], median: [], std_dev: [], mode: [] },
      Memory_UsedPercentage: { mean: [], median: [], std_dev: [], mode: [] },
    };
  }

  records.forEach((record: Record<CsvKeys, number>) => {
    data.Count.push(record.Count);

    // Main metrics
    data.ActiveProcessingCount.mean.push(record.ActiveProcessingCount_mean);
    data.ActiveProcessingCount.median.push(record.ActiveProcessingCount_median);
    data.ActiveProcessingCount.std_dev.push(
      record.ActiveProcessingCount_std_dev,
    );
    data.ActiveProcessingCount.mode.push(record.ActiveProcessingCount_mode);

    data.Host_CPU.mean.push(record.Host_CPU_mean);
    data.Host_CPU.median.push(record.Host_CPU_median);
    data.Host_CPU.std_dev.push(record.Host_CPU_std_dev);
    data.Host_CPU.mode.push(record.Host_CPU_mode);

    data.Host_Memory_Used.mean.push(record.Host_Memory_Used_mean);
    data.Host_Memory_Used.median.push(record.Host_Memory_Used_median);
    data.Host_Memory_Used.std_dev.push(record.Host_Memory_Used_std_dev);
    data.Host_Memory_Used.mode.push(record.Host_Memory_Used_mode);

    data.Host_Memory_UsedPercentage.mean.push(
      record.Host_Memory_UsedPercentage_mean,
    );
    data.Host_Memory_UsedPercentage.median.push(
      record.Host_Memory_UsedPercentage_median,
    );
    data.Host_Memory_UsedPercentage.std_dev.push(
      record.Host_Memory_UsedPercentage_std_dev,
    );
    data.Host_Memory_UsedPercentage.mode.push(
      record.Host_Memory_UsedPercentage_mode,
    );

    data.Worker_CPU.mean.push(record.Worker_CPU_mean);
    data.Worker_CPU.median.push(record.Worker_CPU_median);
    data.Worker_CPU.std_dev.push(record.Worker_CPU_std_dev);
    data.Worker_CPU.mode.push(record.Worker_CPU_mode);

    data.Worker_Memory_Used.mean.push(record.Worker_Memory_Used_mean);
    data.Worker_Memory_Used.median.push(record.Worker_Memory_Used_median);
    data.Worker_Memory_Used.std_dev.push(record.Worker_Memory_Used_std_dev);
    data.Worker_Memory_Used.mode.push(record.Worker_Memory_Used_mode);

    data.Worker_Memory_UsedPercentage.mean.push(
      record.Worker_Memory_UsedPercentage_mean,
    );
    data.Worker_Memory_UsedPercentage.median.push(
      record.Worker_Memory_UsedPercentage_median,
    );
    data.Worker_Memory_UsedPercentage.std_dev.push(
      record.Worker_Memory_UsedPercentage_std_dev,
    );
    data.Worker_Memory_UsedPercentage.mode.push(
      record.Worker_Memory_UsedPercentage_mode,
    );

    // Process data for each processing instance
    for (let i = 1; i <= PHASE_COUNT; i += 1) {
      const processingKey = `Processing_${i}`;

      data.Processing[processingKey].CPU.mean.push(
        record[`Processing_CPU_${i}_mean`],
      );
      data.Processing[processingKey].CPU.median.push(
        record[`Processing_CPU_${i}_median`],
      );
      data.Processing[processingKey].CPU.std_dev.push(
        record[`Processing_CPU_${i}_std_dev`],
      );
      data.Processing[processingKey].CPU.mode.push(
        record[`Processing_CPU_${i}_mode`],
      );

      data.Processing[processingKey].Memory_Used.mean.push(
        record[`Processing_Memory_Used_${i}_mean`],
      );
      data.Processing[processingKey].Memory_Used.median.push(
        record[`Processing_Memory_Used_${i}_median`],
      );
      data.Processing[processingKey].Memory_Used.std_dev.push(
        record[`Processing_Memory_Used_${i}_std_dev`],
      );
      data.Processing[processingKey].Memory_Used.mode.push(
        record[`Processing_Memory_Used_${i}_mode`],
      );

      data.Processing[processingKey].Memory_UsedPercentage.mean.push(
        record[`Processing_Memory_UsedPercentage_${i}_mean`],
      );
      data.Processing[processingKey].Memory_UsedPercentage.median.push(
        record[`Processing_Memory_UsedPercentage_${i}_median`],
      );
      data.Processing[processingKey].Memory_UsedPercentage.std_dev.push(
        record[`Processing_Memory_UsedPercentage_${i}_std_dev`],
      );
      data.Processing[processingKey].Memory_UsedPercentage.mode.push(
        record[`Processing_Memory_UsedPercentage_${i}_mode`],
      );
    }
  });

  if (data.Count.length === 0) {
    throw new Error("CSV file is empty or invalid");
  }

  return data;
}

async function generateAndSaveStatisticsChart(params: {
  workingDir: string;
  csvFile: string;
}) {
  if (!fs.existsSync(params.workingDir)) {
    throw new Error(`Working dir ${params.workingDir} not found`);
  }
  const csvPath = path.join(params.workingDir, params.csvFile);
  const outputDir = path.join(
    params.workingDir,
    `${path.basename(params.workingDir)}-${params.csvFile.replace(".csv", "")}-charts`,
  );

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const data = await validateAndParseStatisticsCsv({
    csvPath,
  });

  // Generate Host CPU chart with statistics
  await generateChart({
    outputDir,
    fileName: "host_cpu_statistics.png",
    labels: data.Count,
    title: "Host CPU Usage Statistics",
    datasets: [
      {
        label: "Mean",
        data: data.Host_CPU.mean,
        borderColor: "rgb(168, 17, 146)",
        datalabels: {
          display: context => {
            const values = data.Host_CPU.mean;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "top",
          formatter: value => `Mean: ${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(168, 17, 146, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
          clamp: true,
        },
      },
      {
        label: "Median",
        data: data.Host_CPU.median,
        borderColor: "rgb(54, 162, 235)",
        datalabels: {
          display: context => {
            const values = data.Host_CPU.median;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "bottom",
          formatter: value => `Median: ${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Std Dev",
        data: data.Host_CPU.std_dev,
        borderColor: "rgb(255, 159, 64)",
        borderDash: [5, 5],
        datalabels: {
          display: context => {
            const values = data.Host_CPU.std_dev;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "top",
          formatter: value => `σ: ${Number(value).toFixed(1)}`,
          backgroundColor: "rgba(255, 159, 64, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Mode",
        data: data.Host_CPU.mode,
        borderColor: "rgb(153, 102, 255)",
        borderDash: [2, 2],
        datalabels: {
          display: false,
        },
      },
      {
        label: "Process Count Mean",
        data: data.ActiveProcessingCount.mean.map((val, idx) => {
          return idx > 0 &&
            Math.ceil(data.ActiveProcessingCount.mean[idx]) !==
              Math.ceil(data.ActiveProcessingCount.mean[idx - 1])
            ? data.Host_CPU.mean[idx]
            : null;
        }),
        borderColor: "rgb(255, 0, 0)",
        backgroundColor: "rgb(0, 255, 0)",
        showLine: false,
        order: -1,

        datalabels: {
          display: true,
          align: "center",
          anchor: "center",
          formatter: (value, context) => {
            return Math.ceil(
              data.ActiveProcessingCount.mean[context.dataIndex],
            );
          },
          backgroundColor: context => {
            const idx = context.dataIndex;
            if (idx === undefined) return "transparent";
            return idx > 0 &&
              data.ActiveProcessingCount.mean[idx] !==
                data.ActiveProcessingCount.mean[idx - 1] &&
              data.ActiveProcessingCount.mean[idx] >
                data.ActiveProcessingCount.mean[idx - 1]
              ? "rgb(0, 255, 0)"
              : "rgb(255,0,0)";
          },
          borderRadius: 100,
          padding: 13,
          font: {
            lineHeight: 1,
          },
        },
      },
    ],
  });

  // Generate Host Memory chart
  await generateChart({
    outputDir,
    fileName: "host_memory_statistics.png",
    labels: data.Count,
    title: "Host Memory Usage Statistics",
    datasets: [
      {
        label: "Mean Usage %",
        data: data.Host_Memory_UsedPercentage.mean,
        borderColor: "rgb(168, 17, 146)",
        datalabels: {
          display: context => {
            const values = data.Host_Memory_UsedPercentage.mean;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "top",
          formatter: value => `Mean: ${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(168, 17, 146, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Mean Used GB",
        data: data.Host_Memory_Used.mean.map(val => val / 1024 / 1024 / 1024),
        borderColor: "rgb(54, 162, 235)",
        datalabels: {
          display: context => {
            const values = data.Host_Memory_Used.mean;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "bottom",
          formatter: value => `${Number(value).toFixed(2)} GB`,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Std Dev %",
        data: data.Host_Memory_UsedPercentage.std_dev,
        borderColor: "rgb(255, 159, 64)",
        borderDash: [5, 5],
        datalabels: {
          display: context => {
            const values = data.Host_Memory_UsedPercentage.std_dev;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "top",
          formatter: value => `σ: ${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(255, 159, 64, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Process Count Mean",
        data: data.ActiveProcessingCount.mean.map((val, idx) => {
          return idx > 0 &&
            Math.ceil(data.ActiveProcessingCount.mean[idx]) !==
              Math.ceil(data.ActiveProcessingCount.mean[idx - 1])
            ? data.Host_Memory_UsedPercentage.mean[idx]
            : null;
        }),
        borderColor: "rgb(255, 0, 0)",
        backgroundColor: "rgb(0, 255, 0)",
        showLine: false,
        order: -1,

        datalabels: {
          display: true,
          align: "center",
          anchor: "center",
          formatter: (value, context) => {
            return Math.ceil(
              data.ActiveProcessingCount.mean[context.dataIndex],
            );
          },
          backgroundColor: context => {
            const idx = context.dataIndex;
            if (idx === undefined) return "transparent";
            return idx > 0 &&
              data.ActiveProcessingCount.mean[idx] !==
                data.ActiveProcessingCount.mean[idx - 1] &&
              data.ActiveProcessingCount.mean[idx] >
                data.ActiveProcessingCount.mean[idx - 1]
              ? "rgb(0, 255, 0)"
              : "rgb(255,0,0)";
          },
          borderRadius: 100,
          padding: 13,
          font: {
            lineHeight: 1,
          },
        },
      },
    ],
  });

  // Generate Worker statistics charts
  await generateChart({
    outputDir,
    fileName: "worker_metrics_statistics.png",
    labels: data.Count,
    title: "Worker Resource Usage Statistics",
    datasets: [
      {
        label: "Worker CPU Mean",
        data: data.Worker_CPU.mean,
        borderColor: "rgb(255, 99, 132)",
        datalabels: {
          display: context => {
            const values = data.Worker_CPU.mean;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "top",
          formatter: value => `Mean: ${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(255, 99, 132, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Worker CPU Std Dev",
        data: data.Worker_CPU.std_dev,
        borderColor: "rgb(255, 159, 64)",
        borderDash: [5, 5],
        datalabels: {
          display: context => {
            const values = data.Worker_CPU.std_dev;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "bottom",
          formatter: value => `σ: ${Number(value).toFixed(1)}`,
          backgroundColor: "rgba(255, 159, 64, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Worker Memory Mean %",
        data: data.Worker_Memory_UsedPercentage.mean,
        borderColor: "rgb(75, 192, 192)",
        datalabels: {
          display: context => {
            const values = data.Worker_Memory_UsedPercentage.mean;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "top",
          formatter: value => `Mean: ${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(75, 192, 192, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Worker Memory Mean GB",
        data: data.Worker_Memory_Used.mean.map(val => val / 1024 / 1024 / 1024),
        borderColor: "rgb(153, 102, 255)",
        datalabels: {
          display: context => {
            const values = data.Worker_Memory_Used.mean;
            const value = Number(values[context.dataIndex]);
            return generateDataLabelsComparison({
              values,
              currentValue: value,
              currentIndex: context.dataIndex,
            });
          },
          align: "bottom",
          formatter: value => `${Number(value).toFixed(2)} GB`,
          backgroundColor: "rgba(153, 102, 255, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Process Count Mean",
        data: data.ActiveProcessingCount.mean.map((val, idx) => {
          return idx > 0 &&
            Math.ceil(data.ActiveProcessingCount.mean[idx]) !==
              Math.ceil(data.ActiveProcessingCount.mean[idx - 1])
            ? data.Worker_CPU.mean[idx]
            : null;
        }),
        borderColor: "rgb(255, 0, 0)",
        backgroundColor: "rgb(0, 255, 0)",
        showLine: false,
        order: -1,

        datalabels: {
          display: true,
          align: "center",
          anchor: "center",
          formatter: (value, context) => {
            return Math.ceil(
              data.ActiveProcessingCount.mean[context.dataIndex],
            );
          },
          backgroundColor: context => {
            const idx = context.dataIndex;
            if (idx === undefined) return "transparent";
            return idx > 0 &&
              data.ActiveProcessingCount.mean[idx] !==
                data.ActiveProcessingCount.mean[idx - 1] &&
              data.ActiveProcessingCount.mean[idx] >
                data.ActiveProcessingCount.mean[idx - 1]
              ? "rgb(0, 255, 0)"
              : "rgb(255,0,0)";
          },
          borderRadius: 100,
          padding: 13,
          font: {
            lineHeight: 1,
          },
        },
      },
    ],
  });

  await generateChart({
    outputDir,
    fileName: "process_count_statistics.png",
    labels: data.Count,
    title: "Active Process Count Statistics",
    datasets: [
      {
        label: "Active Process Count Mean",
        data: data.ActiveProcessingCount.mean,
        borderColor: "rgb(75, 192, 192)",
      },
    ],
  });

  // Generate Processing statistics charts
  const colors = [
    { border: "rgb(153, 102, 255)", bg: "rgba(153, 102, 255, 0.7)" },
    { border: "rgb(255, 205, 86)", bg: "rgba(255, 205, 86, 0.7)" },
    { border: "rgb(201, 203, 207)", bg: "rgba(201, 203, 207, 0.7)" },
  ];

  for (let i = 1; i <= PHASE_COUNT; i += 1) {
    const processingKey = `Processing_${i}`;
    const processingData = data.Processing[processingKey];

    // Skip if no data
    if (processingData.CPU.mean.every(v => v === 0)) continue;

    const colorIdx = (i - 1) % colors.length;

    await generateChart({
      outputDir,
      fileName: `processing_${i}_statistics.png`,
      labels: data.Count,
      title: `Processing ${i} Resource Usage Statistics`,
      datasets: [
        {
          label: `CPU Mean`,
          data: processingData.CPU.mean,
          borderColor: colors[colorIdx].border,
          datalabels: {
            display: context => {
              const values = processingData.CPU.mean;
              const value = Number(values[context.dataIndex]);
              return generateDataLabelsComparison({
                values,
                currentValue: value,
                currentIndex: context.dataIndex,
              });
            },
            align: "top",
            formatter: value => `Mean: ${Number(value).toFixed(1)}%`,
            backgroundColor: colors[colorIdx].bg,
            borderRadius: 4,
            color: "white",
            padding: 4,
          },
        },
        {
          label: `CPU Std Dev`,
          data: processingData.CPU.std_dev,
          borderColor: colors[(colorIdx + 1) % colors.length].border,
          borderDash: [5, 5],
          datalabels: {
            display: context => {
              const values = processingData.CPU.std_dev;
              const value = Number(values[context.dataIndex]);
              return generateDataLabelsComparison({
                values,
                currentValue: value,
                currentIndex: context.dataIndex,
              });
            },
            align: "bottom",
            formatter: value => `σ: ${Number(value).toFixed(1)}`,
            backgroundColor: colors[(colorIdx + 1) % colors.length].bg,
            borderRadius: 4,
            color: "white",
            padding: 4,
          },
        },
        {
          label: `Memory Mean %`,
          data: processingData.Memory_UsedPercentage.mean,
          borderColor: colors[(colorIdx + 2) % colors.length].border,
          datalabels: {
            display: context => {
              const values = processingData.Memory_UsedPercentage.mean;
              const value = Number(values[context.dataIndex]);
              return generateDataLabelsComparison({
                values,
                currentValue: value,
                currentIndex: context.dataIndex,
              });
            },
            align: "top",
            formatter: value => `Mean: ${Number(value).toFixed(1)}%`,
            backgroundColor: colors[(colorIdx + 2) % colors.length].bg,
            borderRadius: 4,
            color: "white",
            padding: 4,
          },
        },
        {
          label: `Memory Mean GB`,
          data: processingData.Memory_Used.mean.map(
            val => val / 1024 / 1024 / 1024,
          ),
          borderColor: "rgb(54, 162, 235)",
          datalabels: {
            display: context => {
              const values = processingData.Memory_Used.mean;
              const value = Number(values[context.dataIndex]);
              return generateDataLabelsComparison({
                values,
                currentValue: value,
                currentIndex: context.dataIndex,
              });
            },
            align: "bottom",
            formatter: value => `${Number(value).toFixed(2)} GB`,
            backgroundColor: "rgba(54, 162, 235, 0.7)",
            borderRadius: 4,
            color: "white",
            padding: 4,
          },
        },
      ],
    });
  }

  console.log(`Statistics charts generated in ${outputDir}`);
}

const generateAndSaveAllStatisticsCharts = async () => {
  const experimentDir = path.resolve(process.cwd(), "experiments");

  if (!fs.existsSync(experimentDir)) {
    console.error("Experiments directory not found");
    return;
  }

  const folders = fs.readdirSync(experimentDir);
  const phaseFolders = folders.filter(folder => /^.*@\d+$/.test(folder));

  for (const phaseFolder of phaseFolders) {
    const folderPath = path.join(experimentDir, phaseFolder);
    const files = fs.readdirSync(folderPath);
    const csvFiles = files.filter(
      file => file.endsWith(".csv") && file.includes("statistics"),
    );

    console.log(
      `Processing ${phaseFolder} - Found ${csvFiles.length} statistics CSV files`,
    );

    for (const csvFile of csvFiles) {
      console.log(`Generating statistics charts for ${csvFile}`);
      try {
        await generateAndSaveStatisticsChart({
          workingDir: folderPath,
          csvFile,
        });
      } catch (error) {
        console.error(`Error processing ${csvFile} in ${phaseFolder}:`, error);
      }
    }
  }

  const globalStatisticsDir = path.join(experimentDir, "globalStatistics");
  if (!fs.existsSync(globalStatisticsDir)) {
    fs.mkdirSync(globalStatisticsDir);
  }

  const globalStatisticsFolders = fs.readdirSync(globalStatisticsDir);
  for (const folder of globalStatisticsFolders) {
    const folderPath = path.join(globalStatisticsDir, folder);
    const files = fs.readdirSync(folderPath);
    const csvFiles = files.filter(file => file.endsWith(".csv"));

    console.log(
      `Processing ${folder} - Found ${csvFiles.length} global statistics CSV files`,
    );

    for (const csvFile of csvFiles) {
      console.log(`Generating global statistics charts for ${csvFile}`);
      try {
        await generateAndSaveStatisticsChart({
          workingDir: folderPath,
          csvFile,
        });
      } catch (error) {
        console.error(`Error processing ${csvFile} in ${folder}:`, error);
      }
    }
  }
};

if (process.argv?.[2] === "generate") {
  generateAndSaveAllStatisticsCharts().catch(console.error);
}

export { generateAndSaveStatisticsChart, generateAndSaveAllStatisticsCharts };
