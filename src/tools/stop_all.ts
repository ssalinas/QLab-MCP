import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";

export const stopAllSchema = z.object({});

export async function stopAll(
  conn: QLabConnection,
  _args: z.infer<typeof stopAllSchema>
): Promise<string> {
  conn.sendVoid(conn.wsAddr("panic"));
  return JSON.stringify({ status: "ok" });
}
