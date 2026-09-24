import * as net from "net";
import { toBuffer as oscToBuffer, fromBuffer as oscFromBuffer } from "osc-min";
import { encodePacket, decodeStream } from "./framing.js";
import type { QLabReplyData } from "./types.js";

interface PendingReply {
  resolve: (data: QLabReplyData) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class QLabOSCClient {
  private socket: net.Socket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private accumulator: Buffer<any> = Buffer.alloc(0);
  private pendingReplies = new Map<string, PendingReply>();
  private replyTimeoutMs: number;

  constructor(replyTimeoutMs = 5000) {
    this.replyTimeoutMs = replyTimeoutMs;
  }

  connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = new net.Socket();

      sock.on("error", (err) => {
        this.rejectAllPending(err);
        reject(err);
      });

      sock.on("close", () => {
        this.rejectAllPending(new Error("QLab connection closed"));
        this.socket = null;
      });

      sock.on("data", (chunk: Buffer) => {
        this.accumulator = Buffer.concat([this.accumulator, chunk]);
        const { packets, remainder } = decodeStream(this.accumulator);
        this.accumulator = remainder;
        for (const pkt of packets) this.handlePacket(pkt);
      });

      sock.connect(port, host, () => {
        this.socket = sock;
        resolve();
      });
    });
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }

  send(address: string, ...args: unknown[]): Promise<QLabReplyData> {
    return new Promise((resolve, reject) => {
      const sock = this.socket;
      if (!sock || sock.destroyed) {
        reject(new Error("Not connected to QLab"));
        return;
      }

      const oscArgs = args.map((a) => (typeof a === "string" ? a : typeof a === "number" ? a : String(a)));

      const msgDv = oscToBuffer({ address, args: oscArgs });
      const framed = encodePacket(Buffer.from((msgDv as DataView).buffer));

      const timer = setTimeout(() => {
        this.pendingReplies.delete(address);
        reject(new Error(`QLab reply timeout for ${address}`));
      }, this.replyTimeoutMs);

      this.pendingReplies.set(address, { resolve, reject, timer });
      sock.write(framed);
    });
  }

  sendVoid(address: string, ...args: unknown[]): void {
    const sock = this.socket;
    if (!sock || sock.destroyed) return;

    const oscArgs = args.map((a) => (typeof a === "string" ? a : typeof a === "number" ? a : String(a)));

    const msgDv = oscToBuffer({ address, args: oscArgs });
    sock.write(encodePacket(Buffer.from((msgDv as DataView).buffer)));
  }

  private handlePacket(pkt: Buffer): void {
    let msg: { address: string; args: Array<{ value: unknown }> };
    try {
      msg = oscFromBuffer(pkt) as typeof msg;
    } catch {
      return;
    }

    // QLab replies arrive at /reply/{original_address}
    if (!msg.address.startsWith("/reply/")) return;

    const originalAddress = msg.address.slice("/reply".length);
    const pending = this.pendingReplies.get(originalAddress);
    if (!pending) return;

    this.pendingReplies.delete(originalAddress);
    clearTimeout(pending.timer);

    const raw = msg.args[0]?.value;
    try {
      const parsed = typeof raw === "string" ? (JSON.parse(raw) as QLabReplyData) : { status: "ok", data: raw };
      pending.resolve(parsed);
    } catch {
      pending.resolve({ status: "ok", data: raw });
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, pending] of this.pendingReplies) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pendingReplies.clear();
  }
}
