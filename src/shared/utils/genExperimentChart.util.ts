/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { generateChart } from "./chartModule.util";

const PHASE_COUNT = 3;

type ProcessingMetrics = {
  Count: number[];
  CPU: number[];
  Memory_UsedPercentage: number[];
  Memory_Used: number[];
};

interface CsvRow {
  Count: number[];
  ActiveProcessingCount: number[];
  Host_CPU: number[];
  Host_Memory_UsedPercentage: number[];
  Host_Memory_Used: number[];
  Worker_CPU: number[];
  Worker_Memory_UsedPercentage: number[];
  Worker_Memory_Used: number[];
  Processing: {
    [key: string]: ProcessingMetrics;
  };
}

async function validateAndParseCsv({
  csvPath,
}: {
  csvPath: string;
}): Promise<CsvRow> {
  if (!fs.existsSync(csvPath)) {
    throw new Error("CSV file not found");
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    cast: (value, context) => {
      if (String(context.column) === "Count") return parseInt(value, 10);
      if (String(context.column)?.includes("_CPU"))
        return parseFloat(value) || 0;
      if (String(context.column)?.includes("Percentage"))
        return parseFloat(value) || 0;
      return value;
    },
  });

  const data: CsvRow = {
    Count: [],
    ActiveProcessingCount: [],
    Host_CPU: [],
    Host_Memory_UsedPercentage: [],
    Host_Memory_Used: [],
    Worker_CPU: [],
    Worker_Memory_UsedPercentage: [],
    Worker_Memory_Used: [],
    Processing: {},
  };

  type CsvRecord = {
    Count: number;
    Host_CPU: number;
    Host_Memory_UsedPercentage: number;
    Host_Memory_Used: number;
    Worker_CPU: number;
    Worker_Memory_UsedPercentage: number;
    Worker_Memory_Used: number;
    [key: string]: any;
  };

  records.forEach((record: CsvRecord) => {
    Object.keys(data).forEach(key => {
      if (key === "Processing") return;
      data[key as Exclude<keyof CsvRow, "Processing">].push(record[key]);
    });

    // Process up to 3 processing entries per row
    Array.from({ length: PHASE_COUNT }, (_, index) => index + 1).forEach(
      (i: number) => {
        const processingId = record[`ProcessingId_${i}`];
        if (processingId) {
          if (!data.Processing[processingId]) {
            data.Processing[processingId] = {
              Count: [],
              CPU: [],
              Memory_UsedPercentage: [],
              Memory_Used: [],
            } satisfies ProcessingMetrics;
          }

          data.Processing[processingId].Count.push(record.Count);
          data.Processing[processingId].CPU.push(record[`Processing_CPU_${i}`]);
          data.Processing[processingId].Memory_UsedPercentage.push(
            record[`Processing_Memory_UsedPercentage_${i}`],
          );
          data.Processing[processingId].Memory_Used.push(
            record[`Processing_Memory_Used_${i}`],
          );
        }
      },
    );
  });

  if (data.Count.length === 0) {
    throw new Error("CSV file is empty or invalid");
  }

  return data;
}

async function generateAndSaveExperimentChart(params: {
  phaseFolder: string;
  csvFile: string;
}) {
  const WORKING_DIR = path.resolve(
    process.cwd(),
    "experiments",
    params.phaseFolder,
  );
  const csvPath = path.join(WORKING_DIR, params.csvFile);
  const outputDir = path.join(WORKING_DIR, `${params.csvFile}-charts`);

  if (!fs.existsSync(WORKING_DIR)) {
    throw new Error("Working dir not found");
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const data = await validateAndParseCsv({
    csvPath,
  });

  // Generate Host charts
  await generateChart({
    outputDir,
    title: "Host Metrics",
    fileName: "host_metrics.png",
    labels: data.Count,
    datasets: [
      {
        label: "Host CPU Usage",
        data: data.Host_CPU,
        borderColor: "rgb(168, 17, 146)",
        datalabels: {
          display: context => {
            const values = data.Host_CPU;
            const value = Number(values[context.dataIndex]);
            const max = Math.max(...values);
            const min = Math.min(...values);
            const firstMinOccurrence = values.indexOf(min);
            const firstMaxOccurrence = values.indexOf(max);
            return (
              (value.toFixed(2) === max.toFixed(2) ||
                value.toFixed(2) === min.toFixed(2)) &&
              (context.dataIndex === firstMinOccurrence ||
                context.dataIndex === firstMaxOccurrence)
            );
          },
          align: "top",
          formatter: value => `${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(168, 17, 146, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Host Memory Usage",
        data: data.Host_Memory_UsedPercentage,
        borderColor: "rgb(54, 162, 235)",
        datalabels: {
          display: context => {
            const values = data.Host_Memory_UsedPercentage;
            const value = Number(values[context.dataIndex]);
            const max = Math.max(...values);
            const min = Math.min(...values);
            const firstMinOccurrence = values.indexOf(min);
            const firstMaxOccurrence = values.indexOf(max);
            return (
              (value.toFixed(2) === max.toFixed(2) ||
                value.toFixed(2) === min.toFixed(2)) &&
              (context.dataIndex === firstMinOccurrence ||
                context.dataIndex === firstMaxOccurrence)
            );
          },
          align: "bottom",
          formatter: (value, context) => {
            return `${(
              data.Host_Memory_Used[context.dataIndex] /
              1024 /
              1024 /
              1024
            ).toFixed(2)} GB`;
          },
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Process Count",
        data: data.ActiveProcessingCount.map((val, idx) =>
          idx > 0 &&
          data.ActiveProcessingCount[idx] !==
            data.ActiveProcessingCount[idx - 1]
            ? data.Host_CPU[idx]
            : null,
        ),
        borderColor: "rgb(255, 0, 0)",
        backgroundColor: "rgb(0, 255, 0)",
        showLine: false,
        order: -1,

        datalabels: {
          display: true,
          align: "center",
          anchor: "center",
          formatter: (value, context) => {
            return data.ActiveProcessingCount[context.dataIndex];
          },
          backgroundColor: context => {
            const idx = context.dataIndex;
            if (idx === undefined) return "transparent";
            return idx > 0 &&
              data.ActiveProcessingCount[idx] !==
                data.ActiveProcessingCount[idx - 1] &&
              data.ActiveProcessingCount[idx] >
                data.ActiveProcessingCount[idx - 1]
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

  // Generate Worker charts
  await generateChart({
    outputDir,
    title: "Worker Container Metrics",
    fileName: "worker_metrics.png",
    labels: data.Count,
    datasets: [
      {
        label: "Worker CPU Usage",
        data: data.Worker_CPU,
        borderColor: "rgb(255, 159, 64)",
        datalabels: {
          display: context => {
            const values = data.Worker_CPU;
            const value = Number(values[context.dataIndex]);
            const max = Math.max(...values);
            const min = Math.min(...values);
            const firstMinOccurrence = values.indexOf(min);
            const firstMaxOccurrence = values.indexOf(max);
            return (
              (value.toFixed(2) === max.toFixed(2) ||
                value.toFixed(2) === min.toFixed(2)) &&
              (context.dataIndex === firstMinOccurrence ||
                context.dataIndex === firstMaxOccurrence)
            );
          },
          align: "top",
          formatter: value => `${Number(value).toFixed(1)}%`,
          backgroundColor: "rgba(168, 17, 146, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Worker Memory Usage",
        data: data.Worker_Memory_UsedPercentage,
        borderColor: "rgb(75, 192, 192)",
        datalabels: {
          display: context => {
            const values = data.Worker_Memory_UsedPercentage;
            const value = Number(values[context.dataIndex]);
            const max = Math.max(...values);
            const min = Math.min(...values);
            const firstMinOccurrence = values.indexOf(min);
            const firstMaxOccurrence = values.indexOf(max);
            return (
              (value.toFixed(2) === max.toFixed(2) ||
                value.toFixed(2) === min.toFixed(2)) &&
              (context.dataIndex === firstMinOccurrence ||
                context.dataIndex === firstMaxOccurrence)
            );
          },
          align: "bottom",
          formatter: (value, context) => {
            return `${(
              data.Host_Memory_Used[context.dataIndex] /
              1024 /
              1024 /
              1024
            ).toFixed(2)} GB`;
          },
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderRadius: 4,
          color: "white",
          padding: 4,
        },
      },
      {
        label: "Process Count",

        data: data.ActiveProcessingCount.map((val, idx) =>
          idx > 0 &&
          data.ActiveProcessingCount[idx] !==
            data.ActiveProcessingCount[idx - 1]
            ? data.Worker_CPU[idx]
            : null,
        ),
        borderColor: "rgb(255, 0, 0)",
        backgroundColor: "rgb(0, 255, 0)",
        showLine: false,
        order: -1,

        datalabels: {
          display: true,
          align: "center",
          anchor: "center",
          formatter: (value, context) => {
            return data.ActiveProcessingCount[context.dataIndex];
          },
          backgroundColor: context => {
            const idx = context.dataIndex;
            if (idx === undefined) return "transparent";
            return idx > 0 &&
              data.ActiveProcessingCount[idx] !==
                data.ActiveProcessingCount[idx - 1] &&
              data.ActiveProcessingCount[idx] >
                data.ActiveProcessingCount[idx - 1]
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

  await Promise.all(
    Object.entries(data.Processing).map(([id, metrics]) => {
      return generateChart({
        outputDir,
        title: `Processing Container Metrics - ${id}`,
        fileName: `processing_${id}.png`,
        labels: metrics.Count,
        datasets: [
          {
            label: `CPU Usage`,
            data: metrics.CPU,
            borderColor: "rgb(153, 102, 255)",
            datalabels: {
              display: context => {
                const values = metrics.CPU;
                const value = Number(values[context.dataIndex]);
                const max = Math.max(...values);
                const min = Math.min(...values);
                const firstMinOccurrence = values.indexOf(min);
                const firstMaxOccurrence = values.indexOf(max);
                return (
                  (value.toFixed(2) === max.toFixed(2) ||
                    value.toFixed(2) === min.toFixed(2)) &&
                  (context.dataIndex === firstMinOccurrence ||
                    context.dataIndex === firstMaxOccurrence)
                );
              },
              align: "top",
              formatter: value => `${Number(value).toFixed(1)}%`,
              backgroundColor: "rgba(168, 17, 146, 0.7)",
              borderRadius: 4,
              color: "white",
              padding: 4,
            },
          },
          {
            label: `Memory Usage`,
            data: metrics.Memory_UsedPercentage,
            borderColor: "rgb(255, 205, 86)",
            datalabels: {
              display: context => {
                const values = metrics.Memory_UsedPercentage;
                const value = Number(values[context.dataIndex]);
                const max = Math.max(...values);
                const min = Math.min(...values);
                const firstMinOccurrence = values.indexOf(min);
                const firstMaxOccurrence = values.indexOf(max);
                return (
                  (value.toFixed(2) === max.toFixed(2) ||
                    value.toFixed(2) === min.toFixed(2)) &&
                  (context.dataIndex === firstMinOccurrence ||
                    context.dataIndex === firstMaxOccurrence)
                );
              },
              align: "bottom",
              formatter: (value, context) => {
                return `${(
                  metrics.Memory_Used[context.dataIndex] /
                  1024 /
                  1024 /
                  1024
                ).toFixed(2)} GB`;
              },
              backgroundColor: "rgba(54, 162, 235, 0.7)",
              borderRadius: 4,
              color: "white",
              padding: 4,
            },
          },
        ],
      });
    }),
  );

  console.log(`Charts generated in ${outputDir}`);
}

const generateAndSaveAllExperimentChart = async () => {
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
      file => file.endsWith(".csv") && !file.includes("statistics"),
    );

    console.log(
      `Processing ${phaseFolder} - Found ${csvFiles.length} CSV files`,
    );

    for (const csvFile of csvFiles) {
      console.log(`  Generating charts for ${csvFile}`);
      try {
        await generateAndSaveExperimentChart({
          phaseFolder,
          csvFile,
        });
      } catch (error) {
        console.error(`Error processing ${csvFile} in ${phaseFolder}:`, error);
      }
    }
  }
};

if (process.argv?.[2] === "generate") {
  generateAndSaveAllExperimentChart().catch(console.error);
}

export { generateAndSaveExperimentChart, generateAndSaveAllExperimentChart };
