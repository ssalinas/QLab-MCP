import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { CUE_TYPES } from "../qlab/types.js";
import { Cue as CueCmd } from "../qlab/commands.js";

export const createCueSchema = z.object({
  type: z.enum(CUE_TYPES).describe("The type of cue to create"),
  name: z.string().optional().describe("Cue name"),
  number: z.string().optional().describe("Cue number (e.g. '1', '1.5', '2a')"),
  notes: z.string().optional().describe("Cue notes"),
  pre_wait: z.number().min(0).optional().describe("Pre-wait time in seconds"),
  duration: z.number().min(0).optional().describe("Duration in seconds"),
  post_wait: z.number().min(0).optional().describe("Post-wait time in seconds"),
  after_cue_id: z.string().optional().describe("Insert the new cue after this cue ID"),
});

export async function createCue(
  conn: QLabConnection,
  args: z.infer<typeof createCueSchema>
): Promise<string> {
  // Create the cue
  const createReply = await conn.send(conn.wsAddr("new"), args.type);
  const newId = (createReply.data as string | undefined) ?? "";

  if (!newId) {
    throw new Error(`QLab did not return a new cue ID. Reply: ${JSON.stringify(createReply)}`);
  }

  // Set properties
  const setters: Promise<unknown>[] = [];

  if (args.name !== undefined) {
    setters.push(conn.send(CueCmd.name(newId), args.name));
  }
  if (args.number !== undefined) {
    setters.push(conn.send(CueCmd.number(newId), args.number));
  }
  if (args.notes !== undefined) {
    setters.push(conn.send(CueCmd.notes(newId), args.notes));
  }
  if (args.pre_wait !== undefined) {
    setters.push(conn.send(CueCmd.preWait(newId), args.pre_wait));
  }
  if (args.duration !== undefined) {
    setters.push(conn.send(CueCmd.duration(newId), args.duration));
  }
  if (args.post_wait !== undefined) {
    setters.push(conn.send(CueCmd.postWait(newId), args.post_wait));
  }

  await Promise.all(setters);

  // Move to position if requested
  if (args.after_cue_id) {
    await conn.send(conn.wsAddr("move", newId, "after", args.after_cue_id));
  }

  return JSON.stringify({ uniqueID: newId, type: args.type });
}
