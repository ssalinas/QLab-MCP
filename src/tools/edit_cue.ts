import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { Cue as CueCmd } from "../qlab/commands.js";
import { CUE_COLORS } from "../qlab/types.js";

export const editCueSchema = z.object({
  cue_id: z.string().describe("The uniqueID of the cue to edit"),
  name: z.string().optional().describe("New cue name"),
  number: z.string().optional().describe("New cue number"),
  notes: z.string().optional().describe("New cue notes"),
  pre_wait: z.number().min(0).optional().describe("Pre-wait in seconds"),
  duration: z.number().min(0).optional().describe("Duration in seconds"),
  post_wait: z.number().min(0).optional().describe("Post-wait in seconds"),
  color: z.enum(CUE_COLORS).optional().describe("Cue color label"),
});

export async function editCue(
  conn: QLabConnection,
  args: z.infer<typeof editCueSchema>
): Promise<string> {
  const id = args.cue_id;
  const updates: Promise<unknown>[] = [];

  if (args.name !== undefined) updates.push(conn.send(CueCmd.name(id), args.name));
  if (args.number !== undefined) updates.push(conn.send(CueCmd.number(id), args.number));
  if (args.notes !== undefined) updates.push(conn.send(CueCmd.notes(id), args.notes));
  if (args.pre_wait !== undefined) updates.push(conn.send(CueCmd.preWait(id), args.pre_wait));
  if (args.duration !== undefined) updates.push(conn.send(CueCmd.duration(id), args.duration));
  if (args.post_wait !== undefined) updates.push(conn.send(CueCmd.postWait(id), args.post_wait));
  if (args.color !== undefined) updates.push(conn.send(CueCmd.colorName(id), args.color));

  if (updates.length === 0) {
    return JSON.stringify({ status: "ok", message: "No fields to update" });
  }

  await Promise.all(updates);
  return JSON.stringify({ status: "ok", cue_id: id });
}
