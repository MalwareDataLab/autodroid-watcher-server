import {
  MetricsReport,
  SystemInformationData,
} from "@shared/types/metrics.type";
import path from "node:path";
import fsSync from "node:fs";
import fsAsync from "node:fs/promises";

class ServerUtils {
  protected procedureId: string;
  protected phase: number;

  private headers = [
    "Count",
    "ServerTime",
    "WorkerName",
    "WorkerTime",
    "ProcedureId",
    "ActiveProcessingCount",
    "Host_CPU",
    "Host_Memory_Total",
    "Host_Memory_Used",
    "Host_Memory_UsedPercentage",
    "Worker_CPU",
    "Worker_Memory_Total",
    "Worker_Memory_Used",
    "Worker_Memory_UsedPercentage",
    "ProcessingId_1",
    "Processing_CPU_1",
    "Processing_Memory_Total_1",
    "Processing_Memory_Used_1",
    "Processing_Memory_UsedPercentage_1",
    "ProcessingId_2",
    "Processing_CPU_2",
    "Processing_Memory_Total_2",
    "Processing_Memory_Used_2",
    "Processing_Memory_UsedPercentage_2",
    "ProcessingId_3",
    "Processing_CPU_3",
    "Processing_Memory_Total_3",
    "Processing_Memory_Used_3",
    "Processing_Memory_UsedPercentage_3",
  ].join(",");

  private async setupProcedureFolderAndGetFolder({
    procedureId,
  }: {
    procedureId: string;
  }): Promise<string> {
    const folderPath = path.join(process.cwd(), "experiments", procedureId);

    if (!fsSync.existsSync(folderPath))
      fsSync.mkdirSync(folderPath, { recursive: true });

    return folderPath;
  }

  protected async writeSystemInformation(
    params: SystemInformationData,
  ): Promise<void> {
    const { procedureId, watcherName } = params;

    const folderPath = await this.setupProcedureFolderAndGetFolder({
      procedureId,
    });

    const logFilePath = path.join(
      folderPath,
      `${watcherName}-systemInformation.json`,
    );

    if (!fsSync.existsSync(logFilePath))
      fsAsync.writeFile(logFilePath, JSON.stringify(params, null, 2));
  }

  protected async write(params: MetricsReport): Promise<void> {
    const {
      watcherName,
      procedureId,
      count,
      hostMetrics,
      workerMetrics,
      processingMetrics,
      error,
      time,
    } = params;

    if (!hostMetrics || !workerMetrics || !processingMetrics) {
      throw new Error("Host or Worker metrics are missing");
    }

    if (error) {
      throw new Error(`Worker reported error ${error}`);
    }

    const folderPath = await this.setupProcedureFolderAndGetFolder({
      procedureId,
    });

    // Group processes by workerName
    const processesByWorker = Object.entries(processingMetrics).reduce(
      (acc, [key, process]) => {
        const { workerName } = process;
        if (!acc[workerName]) {
          acc[workerName] = [];
        }
        acc[workerName].push({ key, process });
        return acc;
      },
      {} as Record<string, Array<{ key: string; process: any }>>,
    );

    // Write a CSV file for each worker group
    await Promise.all(
      Object.entries(processesByWorker).map(
        async ([groupWorkerName, processes]) => {
          const logFilePath = path.join(
            folderPath,
            `${watcherName}-${groupWorkerName}.csv`,
          );

          if (!fsSync.existsSync(logFilePath)) {
            await fsAsync.writeFile(logFilePath, `${this.headers}\n`);
          }

          const serverTime = new Date();
          const serverTimeString = serverTime.toISOString();

          // Flatten processingMetrics for this group
          const processingData = Array(3)
            .fill(null)
            .map((_, i) => {
              const process = processes[i];
              return process
                ? [
                    process.process.processingId,
                    process.process.cpu.usedPercentage ?? "",
                    process.process.memory.total ?? "",
                    process.process.memory.used ?? "",
                    process.process.memory.usedPercentage ?? "",
                  ]
                : ["", "", "", "", ""];
            });

          const row = [
            count,
            serverTimeString,
            groupWorkerName,
            time,
            procedureId,
            processes.length,
            hostMetrics.cpu.usedPercentage ?? "",
            hostMetrics.memory.total ?? "",
            hostMetrics.memory.used ?? "",
            hostMetrics.memory.usedPercentage ?? "",
            workerMetrics.cpu.usedPercentage ?? "",
            workerMetrics.memory.total ?? "",
            workerMetrics.memory.used ?? "",
            workerMetrics.memory.usedPercentage ?? "",
            ...processingData.flat(),
          ].join(",");

          await fsAsync.appendFile(logFilePath, `${row}\n`);
        },
      ),
    );
  }

  protected generateProcedureId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}-${hour}-${minute}-${second}@${this.phase || 0}`;
  }
}

export { ServerUtils };
