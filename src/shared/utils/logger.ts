import { createLogger, format, transports } from "winston";

const customFormat = format.printf(({ timestamp, level, message }) => {
  return `[${timestamp}] [${level}] ${message}`;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.errors({ stack: true }),
    customFormat,
  ),
  transports: [new transports.Console()],
  silent: false,
});

export { logger };
