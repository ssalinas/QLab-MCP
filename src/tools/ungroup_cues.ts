import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { Cue as CueCmd } from "../qlab/commands.js";

export const ungroupCuesSchema = z.object({
  group_cue_id: z.string().describe("The uniqueID of the group cue to dissolve"),
});

export async function ungroupCues(
  conn: QLabConnection,
  args: z.infer<typeof ungroupCuesSchema>
): Promise<string> {
  // Get the group's children
  const reply = await conn.send(CueCmd.children(args.group_cue_id));
  const children = reply.data as Array<{ uniqueID: string }> | undefined;

  if (!children?.length) {
    // Empty group — just delete it
    await conn.send(conn.wsAddr("delete", args.group_cue_id));
    return JSON.stringify({ status: "ok", moved: [], deleted_group: args.group_cue_id });
  }

  // Move each child to just before the group, preserving order
  // We move them in reverse order so that after each move, the next one
  // ends up before its sibling (resulting in correct final order)
  for (const child of [...children].reverse()) {
    await conn.send(conn.wsAddr("move", child.uniqueID, "before", args.group_cue_id));
  }

  // Delete the now-empty group
  await conn.send(conn.wsAddr("delete", args.group_cue_id));

  return JSON.stringify({
    status: "ok",
    moved: children.map((c) => c.uniqueID),
    deleted_group: args.group_cue_id,
  });
}
