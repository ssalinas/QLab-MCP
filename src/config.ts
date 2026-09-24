import { config as loadDotenv } from "dotenv";

loadDotenv();

export interface Config {
  qlabHost: string;
  qlabPort: number;
  qlabPasscode: string;
  replyTimeoutMs: number;
}

export function getConfig(): Config {
  return {
    qlabHost: process.env.QLAB_HOST ?? "127.0.0.1",
    qlabPort: parseInt(process.env.QLAB_PORT ?? "53000", 10),
    qlabPasscode: process.env.QLAB_PASSCODE ?? "",
    replyTimeoutMs: parseInt(process.env.QLAB_REPLY_TIMEOUT_MS ?? "5000", 10),
  };
}
