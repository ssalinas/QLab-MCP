import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { Cue as CueCmd } from "../qlab/commands.js";

export const groupCuesSchema = z.object({
  cue_ids: z.array(z.string()).min(1).describe("Ordered list of cue uniqueIDs to group together"),
  group_name: z.string().optional().describe("Name for the group cue"),
  group_number: z.string().optional().describe("Number for the group cue"),
  after_cue_id: z.string().optional().describe("Place the group after this cue ID"),
});

export async function groupCues(
  conn: QLabConnection,
  args: z.infer<typeof groupCuesSchema>
): Promise<string> {
  // Create a group cue
  const createReply = await conn.send(conn.wsAddr("new"), "group");
  const groupId = createReply.data as string | undefined;

  if (!groupId) {
    throw new Error(`QLab did not return a group cue ID. Reply: ${JSON.stringify(createReply)}`);
  }

  const setters: Promise<unknown>[] = [];
  if (args.group_name) setters.push(conn.send(CueCmd.name(groupId), args.group_name));
  if (args.group_number) setters.push(conn.send(CueCmd.number(groupId), args.group_number));
  await Promise.all(setters);

  // Move each cue into the group sequentially (order matters)
  for (const cueId of args.cue_ids) {
    await conn.send(conn.wsAddr("move", cueId, "to", "0", "inParent", groupId));
  }

  // Move the group to the requested position
  if (args.after_cue_id) {
    await conn.send(conn.wsAddr("move", groupId, "after", args.after_cue_id));
  }

  return JSON.stringify({ status: "ok", group_id: groupId });
}
