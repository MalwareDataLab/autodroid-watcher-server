import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { z } from "zod";

import AppInfo from "@/package.json";
import { logger } from "@shared/utils/logger";
import readline from "node:readline";

const argv = yargs(hideBin(process.argv))
  .scriptName(AppInfo.name)
  .option("token", {
    type: "string",
    alias: "t",
    demandOption: true,
    description: "Authentication token for worker",
  })
  .option("quantity", {
    type: "number",
    alias: "q",
    demandOption: true,
    description: "Expected worker connections",
  })
  .option("port", {
    type: "number",
    alias: "p",
    default: 3000,
    description: "Port for the server (default: 3000)",
  })
  .option("environment", {
    type: "string",
    alias: "e",
    demandOption: true,
    choices: ["dev", "prod"],
    description: "Environment of the server (dev, prod)",
  })
  .option("iterations", {
    type: "number",
    alias: "i",
    default: 1,
    description: "Number of iterations to run",
  })
  .option("email", {
    type: "string",
    demandOption: true,
    description: "Email for authentication",
  })
  .option("firebase-api-token", {
    type: "string",
    demandOption: false,
    description: "Firebase API token for authentication",
  })
  .help()
  .parseSync();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
};

const paramsSchema = z.object({
  token: z.string(),
  quantity: z.number().min(1),
  port: z.number().default(3000),
  email: z.string().email(),
  password: z.string(),
  environment: z.enum(["dev", "prod"]),
  iterations: z.number().default(1),
  "firebase-api-token": z.string().optional(),
});

type Params = z.infer<typeof paramsSchema>;

const params = {
  token: argv.token as string,
  quantity: argv.quantity as number,
  port: argv.port as number,
  email: argv.email as string,
  password: argv.password as string,
  environment: argv.environment as "dev" | "prod",
  iterations: argv.iterations as number,
  "firebase-api-token": argv["firebase-api-token"] as string | undefined,
} as Params;

(async () => {
  const password = await askQuestion("Please enter your password: ");
  rl.close();
  params.password = password;

  const parsedConfig = paramsSchema.safeParse(params);

  if (!parsedConfig.success) {
    const formattedErrors = parsedConfig.error.errors
      .map(err => `${err.path.join(".")}`)
      .join(", ");
    logger.error(`❌ Invalid configuration: ${formattedErrors}`);
    process.exit(1);
  }

  import("@modules/server");
})();

export type { Params };
export { params };
