import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { QLabConnection } from "../qlab/connection.js";

import { listWorkspacesSchema, listWorkspaces } from "./list_workspaces.js";
import { connectWorkspaceSchema, connectWorkspace } from "./connect_workspace.js";
import { listCuesSchema, listCues } from "./list_cues.js";
import { getCueSchema, getCue } from "./get_cue.js";
import { createCueSchema, createCue } from "./create_cue.js";
import { editCueSchema, editCue } from "./edit_cue.js";
import { moveCueSchema, moveCue } from "./move_cue.js";
import { groupCuesSchema, groupCues } from "./group_cues.js";
import { ungroupCuesSchema, ungroupCues } from "./ungroup_cues.js";
import { deleteCueSchema, deleteCue } from "./delete_cue.js";
import { saveWorkspaceSchema, saveWorkspace } from "./save_workspace.js";
import { goSchema, go } from "./go.js";
import { stopAllSchema, stopAll } from "./stop_all.js";

function makeHandler<T>(fn: (conn: QLabConnection, args: T) => Promise<string>, conn: QLabConnection) {
  return async (args: T) => {
    try {
      const text = await fn(conn, args);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }], isError: true };
    }
  };
}

export function registerTools(server: McpServer, conn: QLabConnection): void {
  server.tool(
    "list_workspaces",
    "Discover QLab workspaces available on the network or at a specific host",
    listWorkspacesSchema.shape,
    makeHandler(listWorkspaces, conn)
  );

  server.tool(
    "connect_workspace",
    "Connect to a specific QLab workspace by ID. Must be called before using other tools",
    connectWorkspaceSchema.shape,
    makeHandler(connectWorkspace, conn)
  );

  server.tool(
    "list_cues",
    "List all cues in the connected QLab workspace, optionally flattened",
    listCuesSchema.shape,
    makeHandler(listCues, conn)
  );

  server.tool(
    "get_cue",
    "Get detailed properties of a specific cue by its uniqueID",
    getCueSchema.shape,
    makeHandler(getCue, conn)
  );

  server.tool(
    "create_cue",
    "Create a new cue of the specified type with optional properties and position",
    createCueSchema.shape,
    makeHandler(createCue, conn)
  );

  server.tool(
    "edit_cue",
    "Edit properties of an existing cue (name, number, notes, timing, color)",
    editCueSchema.shape,
    makeHandler(editCue, conn)
  );

  server.tool(
    "move_cue",
    "Move a cue to a new position (before or after another cue)",
    moveCueSchema.shape,
    makeHandler(moveCue, conn)
  );

  server.tool(
    "group_cues",
    "Group a set of cues together into a new group cue",
    groupCuesSchema.shape,
    makeHandler(groupCues, conn)
  );

  server.tool(
    "ungroup_cues",
    "Dissolve a group cue, moving all its children into the parent cue list",
    ungroupCuesSchema.shape,
    makeHandler(ungroupCues, conn)
  );

  server.tool(
    "delete_cue",
    "Delete a cue by its uniqueID",
    deleteCueSchema.shape,
    makeHandler(deleteCue, conn)
  );

  server.tool(
    "save_workspace",
    "Save the current QLab workspace to disk",
    saveWorkspaceSchema.shape,
    makeHandler(saveWorkspace, conn)
  );

  server.tool(
    "go",
    "Trigger the standing-by (next) cue in QLab (equivalent to pressing Go)",
    goSchema.shape,
    makeHandler(go, conn)
  );

  server.tool(
    "stop_all",
    "Panic stop — immediately halt all running cues in QLab",
    stopAllSchema.shape,
    makeHandler(stopAll, conn)
  );
}
