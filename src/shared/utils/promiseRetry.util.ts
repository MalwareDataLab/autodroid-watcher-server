import { sleep } from "./sleep.util";

interface IRetrySettings {
  retries?: number;
  delay?: number;
}

const promiseRetry = async <T>(
  fn: () => Promise<T>,
  params: IRetrySettings = {},
): Promise<T> => {
  const { retries = 3, delay = 100 } = params;
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await sleep(delay);
    return promiseRetry(fn, {
      ...params,
      retries: retries - 1,
    });
  }
};

export { promiseRetry };
