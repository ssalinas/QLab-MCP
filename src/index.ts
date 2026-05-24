import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { QLabConnection } from "./qlab/connection.js";
import { registerTools } from "./tools/registry.js";
import { getConfig } from "./config.js";

async function main() {
  const cfg = getConfig();
  const conn = new QLabConnection(cfg.replyTimeoutMs);

  const server = new McpServer({
    name: "qlab-mcp",
    version: "0.1.0",
  });

  registerTools(server, conn);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", () => {
    conn.disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    conn.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
