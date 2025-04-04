/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import path from "node:path";
import fsAsync from "node:fs/promises";
import fs from "node:fs";
import * as ss from "simple-statistics";

interface StatisticsResult {
  mean: number;
  median: number;
  stdDev: number;
  mode: number;
}

class StatisticsGenerator {
  private numericalColumns = [
    "ActiveProcessingCount",
    "Host_CPU",
    "Host_Memory_Total",
    "Host_Memory_Used",
    "Host_Memory_UsedPercentage",
    "Worker_CPU",
    "Worker_Memory_Total",
    "Worker_Memory_Used",
    "Worker_Memory_UsedPercentage",
    "Processing_CPU_1",
    "Processing_Memory_Total_1",
    "Processing_Memory_Used_1",
    "Processing_Memory_UsedPercentage_1",
    "Processing_CPU_2",
    "Processing_Memory_Total_2",
    "Processing_Memory_Used_2",
    "Processing_Memory_UsedPercentage_2",
    "Processing_CPU_3",
    "Processing_Memory_Total_3",
    "Processing_Memory_Used_3",
    "Processing_Memory_UsedPercentage_3",
  ];

  private async getInputFiles(
    folder: string,
    mode: "experiment" | "phase",
  ): Promise<string[]> {
    const workingDir = path.resolve(process.cwd(), "experiments", folder);
    if (mode === "experiment") {
      const files = await fsAsync.readdir(workingDir);
      return files
        .filter(f => f.endsWith(".csv") && !f.includes("statistics"))
        .map(f => path.join(workingDir, f));
    }
    if (mode === "phase") {
      const parentFolder = await fsAsync.readdir(
        path.resolve(process.cwd(), "experiments"),
      );
      const selectedSubFolders = parentFolder.filter(subFolder =>
        subFolder.endsWith(path.basename(folder)),
      );
      const files: string[] = [];
      for (const subFolder of selectedSubFolders) {
        const subFolderPath = path.join(
          process.cwd(),
          "experiments",
          subFolder,
        );
        const subFiles = await fsAsync.readdir(subFolderPath);
        const csvFiles = subFiles.filter(
          f => f.endsWith(".csv") && !f.includes("statistics"),
        );
        files.push(...csvFiles.map(f => path.join(subFolderPath, f)));
      }
      return files;
    }

    throw new Error("Invalid mode");
  }

  public async combineExperimentMetrics(folder: string): Promise<void> {
    const experimentDir = path.resolve(process.cwd(), "experiments", folder);
    if (!fs.existsSync(experimentDir)) {
      console.error("Experiment directory not found");
      return;
    }

    if (!fs.existsSync(experimentDir))
      throw new Error(`Step folder not found: ${experimentDir}`);

    const files = await this.getInputFiles(experimentDir, "experiment");

    if (!files.length) {
      console.error(
        `No CSV files found in the specified folder ${experimentDir}`,
      );
      return;
    }
    const allData: { headers: string[]; rows: string[][] }[] = [];

    for (const file of files) {
      const fileName = path.basename(file, ".csv");
      const content = await fsAsync.readFile(file, "utf-8");
      const rows = content.split("\n").filter(l => l.trim());

      if (rows.length === 0) continue;

      const headers = rows[0].split(",").map(h => `${fileName}_${h.trim()}`);
      const dataRows = rows
        .slice(1)
        .map(row => row.split(",").map(cell => cell.trim()));

      allData.push({ headers, rows: dataRows });
    }

    // Create combined headers and prepare row structure
    const combinedHeaders = allData.flatMap(data => data.headers);
    const maxRows = Math.max(...allData.map(data => data.rows.length));
    const combinedRows: string[][] = Array(maxRows)
      .fill(0)
      .map(() => []);

    // Populate combined rows
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      for (const data of allData) {
        const rowData =
          rowIndex < data.rows.length
            ? data.rows[rowIndex]
            : Array(data.headers.length).fill("");
        combinedRows[rowIndex].push(...rowData);
      }
    }

    const csvContent = [
      combinedHeaders.join(","),
      ...combinedRows.map(row => row.join(",")),
    ].join("\n");

    const outputPath = path.join(experimentDir, "combined_metrics.csv");
    await fsAsync.writeFile(outputPath, csvContent);
  }

  private async generateMachineGroupStatistics(params: {
    allFiles: string[];
    outputFolder: string;
    isGlobal: boolean;
  }) {
    const group1Files = ["rnp1", "rnp2", "rnp3", "rnp4"];
    const group2Files = ["w1", "w2", "w3", "w4"];
    const group3Files = ["w5"];
    const group4Files = ["ms1"];

    await Promise.all(
      [group1Files, group2Files, group3Files, group4Files].map(
        async (group, index) => {
          const allGroupRows = await this.readAllCSVFiles(
            params.allFiles.filter(file => group.some(g => file.includes(g))),
          );
          if (allGroupRows.length === 0) return;
          const groupedGroupData = this.groupByCount(allGroupRows);
          const groupedStatistics = this.calculateStatistics(groupedGroupData);
          await this.writeOutput(
            groupedStatistics.statistics,
            groupedStatistics.outliers,
            path.resolve(process.cwd(), "experiments", params.outputFolder),
            `${params.isGlobal ? "global." : ""}statistics-group${index + 1}.csv`,
          );
        },
      ),
    );
  }

  public async generateStatistics(
    inputFolder: string,
    mode: "experiment" | "phase" = "experiment",
  ): Promise<void> {
    const files = await this.getInputFiles(inputFolder, mode);
    const allRows = await this.readAllCSVFiles(files);
    const groupedData = this.groupByCount(allRows);
    const { statistics, outliers } = this.calculateStatistics(groupedData);
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}-${String(date.getSeconds()).padStart(2, "0")}`;

    if (mode === "experiment") {
      await this.writeOutput(
        statistics,
        outliers,
        path.resolve(process.cwd(), "experiments", inputFolder),
        `statistics.csv`,
      );

      await this.generateMachineGroupStatistics({
        allFiles: files,
        outputFolder: inputFolder,
        isGlobal: false,
      });
    } else {
      const folderPath = path.resolve(
        process.cwd(),
        "experiments",
        "globalStatistics",
        formattedDate + inputFolder,
      );
      if (!fs.existsSync(folderPath))
        await fsAsync.mkdir(folderPath, { recursive: true });

      await this.writeOutput(
        statistics,
        outliers,
        folderPath,
        `global.statistics.csv`,
      );

      await this.generateMachineGroupStatistics({
        allFiles: files,
        outputFolder: folderPath,
        isGlobal: true,
      });
    }
  }

  private async readAllCSVFiles(files: string[]): Promise<any[]> {
    const allRows: any[] = [];

    for (const file of files) {
      const content = await fsAsync.readFile(file, "utf-8");
      const rows = content.split("\n").filter(l => l.trim());
      const headers = rows[0].split(",");

      for (const row of rows.slice(1)) {
        const values = row.split(",");
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i]?.trim() || "";
          if (this.numericalColumns.includes(h)) {
            obj[h] = parseFloat(obj[h]) || 0;
          }
        });
        allRows.push(obj);
      }
    }

    return allRows;
  }

  private groupByCount(rows: any[]): Record<number, any[]> {
    return rows.reduce(
      (acc, row) => {
        const count = parseInt(row.Count, 10);
        if (!Number.isNaN(count)) {
          acc[count] = acc[count] || [];
          acc[count].push(row);
        }
        return acc;
      },
      {} as Record<number, any[]>,
    );
  }

  private calculateStatistics(groupedData: Record<number, any[]>) {
    const statistics: Record<number, Record<string, StatisticsResult>> = {};
    const outliers: Array<{
      count: number;
      column: string;
      value: number;
      reason: string;
    }> = [];

    Object.entries(groupedData).forEach(([count, rows]) => {
      const countNumber = parseInt(count, 10);
      statistics[countNumber] = {};

      this.numericalColumns.forEach(column => {
        const values = rows
          .map(r => r[column])
          .filter(v => !Number.isNaN(v))
          .sort((a, b) => a - b);

        if (values.length === 0) return;

        /*
        const { cleaned, removed } = this.removeOutliers(values);
        outliers.push(
          ...removed.map(v => ({
            count: countNumber,
            column,
            value: v.value,
            reason: v.reason,
          })),
        );
        */

        statistics[countNumber][column] = this.calculateStats(values);
      });
    });

    return { statistics, outliers };
  }

  private removeOutliers(values: number[]) {
    if (values.length < 4) return { cleaned: values, removed: [] };

    // Using simple-statistics for quartiles
    const q1 = ss.quantile(values, 0.25);
    const q3 = ss.quantile(values, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    return values.reduce(
      (acc, value) => {
        if (value < lower || value > upper) {
          acc.removed.push({
            value,
            reason: value < lower ? "Below lower bound" : "Above upper bound",
          });
        } else {
          acc.cleaned.push(value);
        }
        return acc;
      },
      {
        cleaned: [] as number[],
        removed: [] as Array<{ value: number; reason: string }>,
      },
    );
  }

  private calculateStats(values: number[]): StatisticsResult {
    if (values.length === 0) {
      return { mean: NaN, median: NaN, stdDev: NaN, mode: NaN };
    }

    // Using simple-statistics for calculations
    const mean = ss.mean(values);
    const median = ss.median(values);
    const stdDev = ss.standardDeviation(values);
    const mode = ss.mode(values);

    return {
      mean: Number(mean.toFixed(4)),
      median: Number(median.toFixed(4)),
      stdDev: Number(stdDev.toFixed(4)),
      mode: Number(Number(mode).toFixed(4)),
    };
  }

  private async writeOutput(
    statistics: Record<number, Record<string, StatisticsResult>>,
    outliers: Array<{
      count: number;
      column: string;
      value: number;
      reason: string;
    }>,
    outputDir: string,
    outputFilename: string,
  ) {
    // Write outliers log
    if (outliers.length > 0) {
      const logContent = [
        "Count,Column,Value,Reason",
        ...outliers.map(o => [o.count, o.column, o.value, o.reason].join(",")),
      ].join("\n");
      await fsAsync.writeFile(
        path.join(outputDir, "outliers_log.txt"),
        logContent,
      );
    }

    // Write statistics CSV
    const header = [
      "Count",
      ...this.numericalColumns.flatMap(col => [
        `${col}_mean`,
        `${col}_median`,
        `${col}_std_dev`,
        `${col}_mode`,
      ]),
    ];

    const rows = Object.entries(statistics).map(([count, cols]) => {
      const values = this.numericalColumns.flatMap(col => {
        const stats = cols[col] || {};
        return [
          stats.mean ?? "",
          stats.median ?? "",
          stats.stdDev ?? "",
          stats.mode ?? "",
        ];
      });
      return [count, ...values].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    await fsAsync.writeFile(path.join(outputDir, outputFilename), csvContent);
  }
}

const generateAndSaveAllStatistics = async () => {
  const experimentDir = path.resolve(process.cwd(), "experiments");

  if (!fs.existsSync(experimentDir)) {
    console.error("Experiments directory not found");
    return;
  }

  const folders = fs.readdirSync(experimentDir);

  /* await Promise.all(
    folders
      .filter(folder => folder !== "globalStatistics")
      .map(async folder => {
        await new StatisticsGenerator().combineExperimentMetrics(folder);
      }),
  ); */

  const phaseFolders = folders.filter(folder => /^.*@\d+$/.test(folder));

  for (const phaseFolder of phaseFolders) {
    await new StatisticsGenerator().generateStatistics(
      phaseFolder,
      "experiment",
    );
  }

  // Extract unique phase numbers
  const phaseNumbers = [
    ...new Set(
      phaseFolders
        .map(folder => {
          const match = folder.match(/@(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(Boolean),
    ),
  ].sort((a, b) => (a || 0) - (b || 0));

  // Generate consolidated statistics for each phase
  for (const phaseNumber of phaseNumbers) {
    await new StatisticsGenerator().generateStatistics(
      `@${phaseNumber}`,
      "phase",
    );
  }
};

if (process.argv?.[2] === "generate") {
  generateAndSaveAllStatistics().catch(console.log);
}

export { generateAndSaveAllStatistics };
