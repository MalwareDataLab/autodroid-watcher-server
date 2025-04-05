import { logger } from "@shared/utils/logger";
import { AutoDroidSdk } from "autodroid";
import { startAndGetSessionToken } from "@shared/utils/startAndGetSessionToken.util";
import { params } from "@/src";
import { sleep } from "@shared/utils/sleep.util";
import pAll from "p-all";
import { promiseRetry } from "@shared/utils/promiseRetry.util";
import { generateAndSaveAllExperimentChart } from "@shared/utils/genExperimentChart.util";
import { generateAndSaveAllStatisticsCharts } from "@shared/utils/genStatisticsChart.util";
import { generateAndSaveAllStatistics } from "@shared/utils/genStatistics.util";
import { ServerService } from "./server";
import { defaultMalSynGenParams } from "./constants";

class ServerLabService extends ServerService {
  private processingIds: string[] = [];
  private procedureIds: string[] = [];
  private apiAccessToken: string = "";
  private client: AutoDroidSdk;

  private processorId: string = "";
  private datasetId: string = "";

  constructor() {
    super();

    this.client = new AutoDroidSdk({
      baseUrl: params.url
        ? params.url.endsWith("/graphql")
          ? params.url
          : `${params.url}/graphql`
        : params.environment === "prod"
          ? "https://mdl-api.unihacker.club/graphql"
          : "http://localhost:3333/graphql",
      getAuthToken: async () => this.apiAccessToken,
    });
  }

  private async start({
    procedureId,
    phase,
  }: {
    procedureId: string;
    phase: number;
  }): Promise<void> {
    logger.info("✅ Starting server in lab mode...");

    await this.waitForWorkerWatchersCount();

    this.procedureId = procedureId;
    this.phase = phase || 0;

    this.server.getIo().emit("start", { procedureId: this.procedureId });
  }

  private async stop(): Promise<void> {
    this.server.getIo().emit("stop", { procedureId: this.procedureId });
  }

  private async startSession() {
    const session = await promiseRetry(
      () =>
        startAndGetSessionToken({
          email: params.email,
          password: params.password,
          firebaseWebApiKey:
            params["firebase-api-token"] ||
            (params.environment === "prod"
              ? "AIzaSyBt-FkToQznrkXvSHYF2fM3G4XajCsgihs"
              : "AIzaSyClFM2UQKY3fCPD6708oMQw3zjLtuB_17Y"),
        }),
      { retries: 3, delay: 1000 },
    );

    if (!session) throw new Error("Failed to start session");

    this.apiAccessToken = session.idToken;
  }

  private async dispatchProcesses(quantity: number): Promise<void> {
    try {
      const now = Date.now();
      const processingIds = await Promise.all(
        Array.from({ length: quantity }, async () => {
          const processing = await promiseRetry(() =>
            this.client.processing.requestDatasetProcessing({
              data: {
                dataset_id: this.datasetId,
                processor_id: this.processorId,
                parameters: defaultMalSynGenParams,
              },
            }),
          );

          logger.info(`💥 Processing started: ${processing.id}`);

          return processing.id;
        }),
      );

      this.processingIds = processingIds;
      logger.info(
        `🆗 Dispatched ${processingIds.length} on ${Date.now() - now}ms`,
      );
    } catch (error: any) {
      logger.error(`Error dispatching processes ${error.message}`);
      logger.error(JSON.stringify(error.response, null, 2));
      throw new Error("Failed to dispatch processes");
    }
  }

  private async getNotFinishedProcesses() {
    const processingResults = await pAll(
      this.processingIds.map(processingId => async () => {
        await sleep(500);
        return promiseRetry(() =>
          this.client.processing.getOne({ processingId }),
        );
      }),
      { concurrency: 1 },
    );

    const runningProcesses = processingResults.filter(
      result => !result.finished_at,
    );

    return runningProcesses;
  }

  private async checkProcessesSuccess() {
    const processingResults = await pAll(
      this.processingIds.map(processingId => async () => {
        await sleep(500);
        return promiseRetry(() =>
          this.client.processing.getOne({ processingId }),
        );
      }),
    );

    const failedProcesses = processingResults.filter(
      result => result.status !== "SUCCEEDED",
    );

    if (failedProcesses.length > 0) {
      logger.error(
        `❌ Processes succeeded ${processingResults.length - failedProcesses.length}. But failed (${failedProcesses.length}): ${failedProcesses.map(item => item.id).join(", ")}`,
      );
      throw new Error("Some processes failed");
    }

    logger.info("All processes completed successfully");
  }

  public async initBackendConnection(): Promise<void> {
    await this.startSession();
    await promiseRetry(() => this.client.dataset.getMany({}));

    const processor = await promiseRetry(() =>
      this.client.processor.getMany({}),
    );

    const malSynGenProcessor = processor.edges.find(
      edge => edge.node.name === "MalSynGen",
    );
    if (!malSynGenProcessor) throw new Error("MalSynGen processor not found");

    const datasets = await this.client.dataset.getMany({});

    const selectedDataset = datasets.edges.find(edge =>
      edge.node.description?.includes(params["dataset-name"]),
    );
    if (!selectedDataset)
      throw new Error(`${params["dataset-name"]} dataset not found`);

    this.datasetId = selectedDataset.node.id;
    this.processorId = malSynGenProcessor.node.id;
  }

  public async run() {
    await Array.from({ length: params.iterations }).reduce(
      async (previousI, __, i) => {
        await previousI;

        logger.info(`Starting iteration ${i + 1} of ${params.iterations}...`);
        this.phase = 0;

        await Array.from({ length: 3 }).reduce(
          async (previousPromise, _, index) => {
            await previousPromise;

            await this.initBackendConnection();
            await this.waitForWorkerWatchersCount();

            this.phase = index + 1;

            await sleep(5000);

            logger.info(
              `Starting phase ${this.phase} of iteration ${i + 1}...`,
            );

            const procedureId = this.generateProcedureId();
            this.procedureIds.push(procedureId);
            await this.start({
              phase: this.phase,
              procedureId,
            });
            await this.dispatchProcesses(
              this.phase * params["processes-per-phase"],
            );

            await sleep(5000);

            await new Promise<void>(resolve => {
              const interval = setInterval(async () => {
                const notFinishedProcesses =
                  await this.getNotFinishedProcesses();
                if (notFinishedProcesses.length === 0) {
                  clearInterval(interval);
                  resolve();
                }
              }, 1000);
            });

            logger.info("All processes finished");
            await this.checkProcessesSuccess();
            await this.stop();

            logger.info(
              `Phase ${this.phase} of iteration ${i + 1} completed...`,
            );
            await sleep(5000);
          },
          Promise.resolve(),
        );
        logger.info(`All phases of iteration ${i + 1} completed...`);
      },
      Promise.resolve(),
    );

    logger.info("All iterations completed...");
    await this.stop();
    await generateAndSaveAllStatistics();
    await generateAndSaveAllExperimentChart();
    await generateAndSaveAllStatisticsCharts();
    this.closeServer();
    process.exit(0);
  }
}

const server = new ServerLabService();

server.run().catch(err => {
  logger.error(`Failed to run server. ${err}`);
  process.exit(1);
});

export { server };
