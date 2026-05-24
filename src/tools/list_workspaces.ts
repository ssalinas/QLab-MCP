import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { discoverQLab } from "../osc/discovery.js";
import { getConfig } from "../config.js";

export const listWorkspacesSchema = z.object({
  host: z.string().optional().describe("QLab host IP or hostname (defaults to QLAB_HOST env var)"),
  port: z.number().int().optional().describe("QLab OSC port (default 53000)"),
  discover: z.boolean().optional().describe("Also run Bonjour/mDNS discovery on the local network"),
});

export async function listWorkspaces(
  conn: QLabConnection,
  args: z.infer<typeof listWorkspacesSchema>
): Promise<string> {
  const cfg = getConfig();
  const host = args.host ?? cfg.qlabHost;
  const port = args.port ?? cfg.qlabPort;

  const discovered = args.discover ? await discoverQLab(3000) : [];

  if (!conn.isConnected) {
    await conn.connect(host, port);
  }

  const workspaces = await conn.listWorkspaces();

  const result: Record<string, unknown> = { workspaces };
  if (discovered.length > 0) result.discovered = discovered;

  return JSON.stringify(result, null, 2);
}
