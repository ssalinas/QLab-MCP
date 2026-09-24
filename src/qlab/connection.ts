import { QLabOSCClient } from "../osc/client.js";
import { WORKSPACES, Workspace as WS } from "./commands.js";
import type { Workspace, Cue } from "./types.js";
import type { QLabReplyData } from "../osc/types.js";

export class QLabConnection {
  private client: QLabOSCClient;
  workspaceId: string | null = null;
  isAuthenticated = false;

  constructor(replyTimeoutMs = 5000) {
    this.client = new QLabOSCClient(replyTimeoutMs);
  }

  get isConnected(): boolean {
    return this.client.isConnected;
  }

  async connect(host: string, port: number): Promise<void> {
    await this.client.connect(host, port);
  }

  disconnect(): void {
    this.client.disconnect();
    this.workspaceId = null;
    this.isAuthenticated = false;
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const reply = await this.client.send(WORKSPACES);
    const data = reply.data as Array<{ uniqueID: string; displayName: string; hasPasscode: boolean; version?: string }> | undefined;
    return (data ?? []).map((w) => ({
      uniqueID: w.uniqueID,
      displayName: w.displayName,
      hasPasscode: w.hasPasscode ?? false,
      version: w.version,
    }));
  }

  async connectWorkspace(workspaceId: string, passcode?: string): Promise<void> {
    const args = passcode ? [passcode] : [];
    const reply = await this.client.send(WS.connect(workspaceId), ...args);
    if (reply.status !== "ok" && reply.status !== "connectedWithPasscode") {
      throw new Error(`QLab refused workspace connection: ${reply.status}`);
    }
    this.workspaceId = workspaceId;
    this.isAuthenticated = true;
  }

  async send(address: string, ...args: unknown[]): Promise<QLabReplyData> {
    this.requireWorkspace();
    return this.client.send(address, ...args);
  }

  sendVoid(address: string, ...args: unknown[]): void {
    this.requireWorkspace();
    this.client.sendVoid(address, ...args);
  }

  async sendRaw(address: string, ...args: unknown[]): Promise<QLabReplyData> {
    return this.client.send(address, ...args);
  }

  wsAddr(...parts: string[]): string {
    this.requireWorkspace();
    return `/workspace/${this.workspaceId!}/${parts.join("/")}`;
  }

  async getCueLists(): Promise<Cue[]> {
    const reply = await this.send(this.wsAddr("cueLists"));
    return (reply.data as Cue[] | undefined) ?? [];
  }

  private requireWorkspace(): void {
    if (!this.workspaceId) throw new Error("No workspace connected. Call connect_workspace first.");
  }
}
