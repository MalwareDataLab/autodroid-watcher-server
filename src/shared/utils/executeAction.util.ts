// Util import
import { sleep } from "@shared/utils/sleep.util";
import { logger } from "@shared/utils/logger";

interface IParams {
  actionName?: string;
  action: (params: { attempt: number }) => Promise<any>;
  attempt?: number;
  maxRetries?: number;
  retryDelay?: number;
  logging?: boolean;
}

const executeAction = async (params: IParams): Promise<any> => {
  const {
    actionName = "Action",
    action,
    attempt = 1,
    maxRetries = 3,
    logging,
  } = params;

  try {
    const result = await action({ attempt });
    logger.info(
      attempt > 1
        ? `🆗 ${actionName} success with attempt ${attempt} ❎. `
        : `🆗 ${actionName} success.`,
    );
    return result;
  } catch (err: any) {
    if (attempt > maxRetries)
      throw new Error(
        `❌ ${actionName} failure after ${
          attempt - 1
        } retries. ${err?.message}`,
      );

    if (logging)
      logger.error(
        `❌ ${actionName} attempt ${attempt} failed. 🔄 Retrying... ${err.message} `,
      );
    await sleep(params.retryDelay || 5000);
    return executeAction({
      ...params,
      attempt: attempt + 1,
    });
  }
};

export { executeAction };
