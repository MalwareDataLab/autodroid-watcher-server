import { logger } from "@shared/utils/logger";
import { AutoDroidSdk } from "autodroid";
import { startAndGetSessionToken } from "@shared/utils/startAndGetSessionToken.util";
import { params } from "@/src";
import { sleep } from "@shared/utils/sleep.util";
import pAll from "p-all";
import { promiseRetry } from "@shared/utils/promiseRetry.util";
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
      baseUrl:
        params.environment === "prod"
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

    await this.waitForWorkersCount();

    this.procedureId = procedureId;
    this.phase = phase || 0;

    this.server.getIo().emit("start", { procedureId: this.procedureId });
  }

  private async stop(): Promise<void> {
    this.server.getIo().emit("stop", { procedureId: this.procedureId });
  }

  private async startSession() {
    const session = await promiseRetry(() =>
      startAndGetSessionToken({
        email: params.email,
        password: params.password,
        firebaseWebApiKey:
          params.environment === "prod"
            ? "AIzaSyBt-FkToQznrkXvSHYF2fM3G4XajCsgihs"
            : "AIzaSyClFM2UQKY3fCPD6708oMQw3zjLtuB_17Y",
      }),
    );

    if (!session) throw new Error("Failed to start session");

    this.apiAccessToken = session.idToken;
  }

  private async dispatchProcesses(quantity: number): Promise<void> {
    try {
      /*
      const processingIds = await pAll(
        Array.from({ length: quantity }, () => async () => {
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
        { concurrency: 1 },
      );
      */

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
      logger.info(`🆗 Dispatched ${processingIds.length}`);
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

    const drebinDataset = datasets.edges.find(edge =>
      edge.node.description?.includes("Drebin"),
    );
    if (!drebinDataset) throw new Error("Drebin dataset not found");

    this.datasetId = drebinDataset.node.id;
    this.processorId = malSynGenProcessor.node.id;
  }

  public async run() {
    await this.initBackendConnection();
    await this.waitForWorkersCount();

    await sleep(5000);

    await Array.from({ length: 3 }).reduce(
      async (previousPromise, _, index) => {
        await previousPromise;

        this.phase = index + 1;

        await sleep(5000);
        /* await new Promise<void>(resolve => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          rl.question(`Press ENTER to start phase ${this.phase}...`, () => {
            rl.close();
            resolve();
          });
        }); */

        logger.info(`Starting phase ${this.phase}...`);

        const procedureId = this.generateProcedureId();
        this.procedureIds.push(procedureId);
        await this.start({
          phase: this.phase,
          procedureId,
        });
        await this.dispatchProcesses(this.phase * params.quantity);

        await sleep(5000);

        await new Promise<void>(resolve => {
          const interval = setInterval(async () => {
            const notFinishedProcesses = await this.getNotFinishedProcesses();
            if (notFinishedProcesses.length === 0) {
              clearInterval(interval);
              resolve();
            }
          }, 1000);
        });

        logger.info("All processes finished");
        await this.checkProcessesSuccess();
        await this.stop();

        logger.info(`Phase ${this.phase} completed...`);
        await sleep(5000);
      },
      Promise.resolve(),
    );

    logger.info("All phases completed...");
    await this.stop();
    this.closeServer();
    process.exit(0);
  }
}

const server = new ServerLabService();

server.run().catch(err => {
  logger.error("Failed to start server in lab mode", err);
});

export { server };
