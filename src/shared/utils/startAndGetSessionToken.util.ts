import { logger } from "./logger";

export interface IFirebaseSessionDTO {
  idToken: string;
  localId: string;
  refreshToken: string;
  email: string;
  displayName: string | null;
}

export const startAndGetSessionToken = async ({
  email,
  password,
  firebaseWebApiKey,
}: {
  email: string;
  password: string;
  firebaseWebApiKey: string;
}): Promise<IFirebaseSessionDTO> => {
  const body = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  const testVariables: Record<string, any> = JSON.parse(
    process.env.TEST_VARIABLES || "{}",
  );

  if (testVariables.sessions?.[email]?.data?.idToken) {
    if (testVariables.sessions[email].createdAt + 3600 * 1000 > Date.now()) {
      return testVariables.sessions[email].data;
    }
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      redirect: "follow",
    },
  );

  const data = await res.json();

  if (!data.idToken) {
    logger.error(JSON.stringify(data, null, 2));
    throw new Error(`Fail to start session. Your password might be incorrect.`);
  }

  const updatedTestVariables = {
    ...testVariables,
    sessions: {
      ...testVariables.sessions,
      [email]: {
        createdAt: Date.now(),
        data,
      },
    },
  };

  process.env.TEST_VARIABLES = JSON.stringify(updatedTestVariables);

  return data;
};
