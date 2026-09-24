import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";

export const moveCueSchema = z.object({
  cue_id: z.string().describe("The uniqueID of the cue to move"),
  after_cue_id: z.string().optional().describe("Move cue to after this cue ID"),
  before_cue_id: z.string().optional().describe("Move cue to before this cue ID"),
});

export async function moveCue(
  conn: QLabConnection,
  args: z.infer<typeof moveCueSchema>
): Promise<string> {
  if (!args.after_cue_id && !args.before_cue_id) {
    throw new Error("Either after_cue_id or before_cue_id must be specified");
  }
  if (args.after_cue_id) {
    await conn.send(conn.wsAddr("move", args.cue_id, "after", args.after_cue_id));
  } else if (args.before_cue_id) {
    await conn.send(conn.wsAddr("move", args.cue_id, "before", args.before_cue_id));
  }
  return JSON.stringify({ status: "ok", cue_id: args.cue_id });
}
