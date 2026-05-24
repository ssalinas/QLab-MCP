import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";

export const saveWorkspaceSchema = z.object({});

export async function saveWorkspace(
  conn: QLabConnection,
  _args: z.infer<typeof saveWorkspaceSchema>
): Promise<string> {
  await conn.send(conn.wsAddr("save"));
  return JSON.stringify({ status: "ok" });
}
