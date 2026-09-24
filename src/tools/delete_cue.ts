import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";

export const deleteCueSchema = z.object({
  cue_id: z.string().describe("The uniqueID of the cue to delete"),
});

export async function deleteCue(
  conn: QLabConnection,
  args: z.infer<typeof deleteCueSchema>
): Promise<string> {
  await conn.send(conn.wsAddr("delete", args.cue_id));
  return JSON.stringify({ status: "ok", cue_id: args.cue_id });
}
