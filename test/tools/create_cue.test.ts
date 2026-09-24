import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QLabConnection } from "../../src/qlab/connection.js";
import { MockQLabServer } from "../helpers/mock_qlab_server.js";
import { createCue, createCueSchema } from "../../src/tools/create_cue.js";
import { editCue } from "../../src/tools/edit_cue.js";
import { deleteCue } from "../../src/tools/delete_cue.js";
import { Cue as CueCmd } from "../../src/qlab/commands.js";

describe("createCue tool", () => {
  let server: MockQLabServer;
  let conn: QLabConnection;
  const sentMessages: Array<{ address: string; args: unknown[] }> = [];

  beforeEach(async () => {
    server = new MockQLabServer();

    // Track all messages the server receives
    const handlers = new Map<string, (args: unknown[]) => { status: string; data?: unknown }>();
    handlers.set("/workspace/ws-test-123/new", (args) => ({
      status: "ok",
      data: `cue-${args[0]}-mock`,
    }));

    // Register catch-all for set commands
    for (const prop of ["name", "number", "notes", "preWait", "duration", "postWait"]) {
      server.on(`/cue/cue-audio-mock/${prop}`, () => {
        return { status: "ok" };
      });
    }

    // Accept any /cue/{id}/property set commands
    server.onPrefix("/cue/", () => ({ status: "ok" }));

    const port = await server.listen();
    conn = new QLabConnection(2000);
    await conn.connect("127.0.0.1", port);
    await conn.connectWorkspace("ws-test-123");
  });

  afterEach(async () => {
    conn.disconnect();
    await server.close();
  });

  it("creates an audio cue and returns uniqueID", async () => {
    const result = JSON.parse(
      await createCue(conn, { type: "audio", name: "Rain SFX", number: "1" })
    );
    expect(result.uniqueID).toBeTruthy();
    expect(result.type).toBe("audio");
  });

  it("creates a group cue", async () => {
    const result = JSON.parse(
      await createCue(conn, { type: "group", name: "Scene 1" })
    );
    expect(result.type).toBe("group");
  });

  it("rejects an invalid cue type via schema validation", () => {
    const result = createCueSchema.safeParse({ type: "invalid_type" });
    expect(result.success).toBe(false);
  });
});

describe("editCue tool", () => {
  let server: MockQLabServer;
  let conn: QLabConnection;

  beforeEach(async () => {
    server = new MockQLabServer();
    server.on(CueCmd.name("cue-abc"), () => ({ status: "ok" }));
    server.on(CueCmd.notes("cue-abc"), () => ({ status: "ok" }));
    server.on(CueCmd.colorName("cue-abc"), () => ({ status: "ok" }));

    const port = await server.listen();
    conn = new QLabConnection(2000);
    await conn.connect("127.0.0.1", port);
    await conn.connectWorkspace("ws-test-123");
  });

  afterEach(async () => {
    conn.disconnect();
    await server.close();
  });

  it("edits cue name and notes", async () => {
    const result = JSON.parse(
      await editCue(conn, { cue_id: "cue-abc", name: "New Name", notes: "Some notes" })
    );
    expect(result.status).toBe("ok");
  });

  it("returns ok when no fields provided", async () => {
    const result = JSON.parse(await editCue(conn, { cue_id: "cue-abc" }));
    expect(result.status).toBe("ok");
  });
});

describe("deleteCue tool", () => {
  let server: MockQLabServer;
  let conn: QLabConnection;

  beforeEach(async () => {
    server = new MockQLabServer();
    server.on("/workspace/ws-test-123/delete/cue-xyz", () => ({ status: "ok" }));

    const port = await server.listen();
    conn = new QLabConnection(2000);
    await conn.connect("127.0.0.1", port);
    await conn.connectWorkspace("ws-test-123");
  });

  afterEach(async () => {
    conn.disconnect();
    await server.close();
  });

  it("deletes a cue", async () => {
    const result = JSON.parse(await deleteCue(conn, { cue_id: "cue-xyz" }));
    expect(result.status).toBe("ok");
  });
});
