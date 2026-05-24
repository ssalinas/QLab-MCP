import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QLabOSCClient } from "../../src/osc/client.js";
import { MockQLabServer } from "../helpers/mock_qlab_server.js";

describe("QLabOSCClient", () => {
  let server: MockQLabServer;
  let port: number;
  let client: QLabOSCClient;

  beforeEach(async () => {
    server = new MockQLabServer();
    port = await server.listen();
    client = new QLabOSCClient(2000);
    await client.connect("127.0.0.1", port);
  });

  afterEach(async () => {
    client.disconnect();
    await server.close();
  }, 15000);

  it("sends a message and receives a reply", async () => {
    const reply = await client.send("/workspaces");
    expect(reply.status).toBe("ok");
    expect(Array.isArray(reply.data)).toBe(true);
  });

  it("handles multiple concurrent requests", async () => {
    const [r1, r2] = await Promise.all([
      client.send("/workspaces"),
      client.send("/workspace/ws-test-123/connect"),
    ]);
    expect(r1.status).toBe("ok");
    expect(r2.status).toBe("ok");
  });

  it("reports connection state correctly", async () => {
    expect(client.isConnected).toBe(true);
    client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it("rejects when timeout expires", async () => {
    const fastClient = new QLabOSCClient(50);
    await fastClient.connect("127.0.0.1", port);

    await expect(fastClient.send("/no/handler/registered/for/this")).rejects.toThrow("timeout");
    fastClient.disconnect();
  });
});
