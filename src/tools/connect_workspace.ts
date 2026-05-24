import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { getConfig } from "../config.js";

export const connectWorkspaceSchema = z.object({
  workspace_id: z.string().describe("The uniqueID of the QLab workspace to connect to"),
  passcode: z.string().optional().describe("Workspace passcode if required"),
  host: z.string().optional().describe("QLab host (defaults to QLAB_HOST env var)"),
  port: z.number().int().optional().describe("QLab OSC port (default 53000)"),
});

export async function connectWorkspace(
  conn: QLabConnection,
  args: z.infer<typeof connectWorkspaceSchema>
): Promise<string> {
  const cfg = getConfig();
  const host = args.host ?? cfg.qlabHost;
  const port = args.port ?? cfg.qlabPort;
  const passcode = args.passcode ?? cfg.qlabPasscode;

  if (!conn.isConnected) {
    await conn.connect(host, port);
  }

  await conn.connectWorkspace(args.workspace_id, passcode || undefined);

  return JSON.stringify({ status: "ok", workspace_id: args.workspace_id, host, port });
}
