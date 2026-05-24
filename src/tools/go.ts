import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";

export const goSchema = z.object({});

export async function go(
  conn: QLabConnection,
  _args: z.infer<typeof goSchema>
): Promise<string> {
  conn.sendVoid(conn.wsAddr("go"));
  return JSON.stringify({ status: "ok" });
}
