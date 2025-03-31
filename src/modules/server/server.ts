import { WebsocketServer } from "@shared/infrastructure/websocketServer";
import { params } from "@/src";
import { logger } from "@shared/utils/logger";
import { ServerUtils } from "./utils";

class ServerService extends ServerUtils {
  protected server: WebsocketServer;
  public readonly initialization: Promise<void>;

  constructor() {
    super();
    this.server = new WebsocketServer();

    this.initialization = this.startServer();
  }

  public getConnectedWorkerWatchersCount(): number {
    return this.server.getIo().engine.clientsCount;
  }

  public async waitForWorkerWatchersCount(): Promise<void> {
    const { quantity } = params;

    logger.info(`Waiting for ${quantity} worker watchers to connect...`);

    let timeoutId: NodeJS.Timeout;

    await Promise.race([
      new Promise(resolve => {
        const interval = setInterval(() => {
          const connectedWorkerWatchers =
            this.getConnectedWorkerWatchersCount();
          if (connectedWorkerWatchers >= quantity) {
            clearInterval(interval);
            clearTimeout(timeoutId);
            resolve(true);
          }
        }, 1000);
      }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          logger.error(
            `Timeout waiting for worker watchers. Available: ${this.getConnectedWorkerWatchersCount()}`,
          );
          reject(new Error("Timeout waiting for worker watchers"));
          process.exit(1);
        }, 60000);
      }),
    ]);

    logger.info(
      `🆗 Worker watchers connected: ${this.getConnectedWorkerWatchersCount()}.`,
    );
  }

  private async startServer(): Promise<void> {
    await this.server.start(params.port);

    this.server.getIo().on("connection", socket => {
      socket.on("systemInformation", async data => {
        if (!data.procedureId) {
          logger.error(`Received system information with missing procedureId`);
        } else {
          // await this.writeSystemInformation(data);
        }
      });

      socket.on("report", data => {
        if (
          !data.watcherName ||
          !data.procedureId ||
          typeof data.count !== "number"
        ) {
          logger.error(
            `Received report with missing data. watcherName: ${data.watcherName}, procedureId: ${data.procedureId}, count: ${data.count}`,
          );
          return;
        }

        if (data.error) {
          logger.error(`Received report with error: ${data.error}`);
          return;
        }

        if (
          !data.hostMetrics ||
          !data.workerMetrics ||
          !data.processingMetrics
        ) {
          logger.error(
            `Received report with missing metrics. Host: ${data.hostMetrics}, Worker: ${data.workerMetrics}, Processing: ${data.processingMetrics}`,
          );
          return;
        }

        this.write(data);
      });

      socket.on("disconnect", () => {
        logger.info(`Worker watcher ${socket.id} disconnected`);
      });
    });
  }

  public closeServer(): void {
    this.server.stop();
  }
}

export { ServerService };
