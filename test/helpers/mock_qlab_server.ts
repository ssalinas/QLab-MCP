import * as net from "net";
import { toBuffer as oscToBuffer, fromBuffer as oscFromBuffer } from "osc-min";
import { encodePacket, decodeStream } from "../../src/osc/framing.js";

interface MockResponse {
  status: string;
  data?: unknown;
}

type Handler = (args: unknown[]) => MockResponse;

export class MockQLabServer {
  private server: net.Server;
  private handlers = new Map<string, Handler>();
  private prefixHandlers: Array<{ prefix: string; handler: Handler }> = [];
  private sockets = new Set<net.Socket>();
  private accumulator = Buffer.alloc(0);

  constructor() {
    this.server = net.createServer((sock) => this.handleClient(sock));
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers() {
    this.on("/workspaces", () => ({
      status: "ok",
      data: [{ uniqueID: "ws-test-123", displayName: "Test Workspace", hasPasscode: false }],
    }));

    this.on("/workspace/ws-test-123/connect", () => ({ status: "ok" }));
    this.on("/workspace/ws-test-123/save", () => ({ status: "ok" }));
    this.on("/workspace/ws-test-123/cueLists", () => ({ status: "ok", data: [] }));

    this.on("/workspace/ws-test-123/new", (args) => ({
      status: "ok",
      data: `cue-${args[0] ?? "unknown"}-${Date.now()}`,
    }));
  }

  on(address: string, handler: Handler): this {
    this.handlers.set(address, handler);
    return this;
  }

  onPrefix(prefix: string, handler: Handler): this {
    this.prefixHandlers.push({ prefix, handler });
    return this;
  }

  private handleClient(sock: net.Socket) {
    this.sockets.add(sock);
    sock.on("close", () => this.sockets.delete(sock));
    let acc = Buffer.alloc(0);

    sock.on("data", (chunk: Buffer) => {
      acc = Buffer.concat([acc, chunk]);
      const { packets, remainder } = decodeStream(acc);
      acc = remainder;

      for (const pkt of packets) {
        let msg: { address: string; args: Array<{ value: unknown }> };
        try {
          msg = oscFromBuffer(pkt) as typeof msg;
        } catch {
          continue;
        }

        const handler =
          this.handlers.get(msg.address) ??
          this.prefixHandlers.find(({ prefix }) => msg.address.startsWith(prefix))?.handler;
        if (!handler) continue;
        const rawArgs = msg.args.map((a) => a.value);
        const result = handler(rawArgs);

        const replyAddress = `/reply${msg.address}`;
        const replyDv = oscToBuffer({
          address: replyAddress,
          args: [JSON.stringify(result)],
        });
        sock.write(encodePacket(Buffer.from((replyDv as DataView).buffer)));
      }
    });
  }

  listen(port = 0): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(port, "127.0.0.1", () => {
        const addr = this.server.address() as net.AddressInfo;
        resolve(addr.port);
      });
    });
  }

  close(): Promise<void> {
    for (const sock of this.sockets) sock.destroy();
    this.sockets.clear();
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
