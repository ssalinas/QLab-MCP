import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import { Cue as CueCmd } from "../qlab/commands.js";

const DEFAULT_KEYS = [
  "uniqueID",
  "type",
  "number",
  "name",
  "notes",
  "duration",
  "preWait",
  "postWait",
  "colorName",
  "isBroken",
  "isRunning",
  "children",
];

export const getCueSchema = z.object({
  cue_id: z.string().describe("The uniqueID of the cue"),
  keys: z.array(z.string()).optional().describe("Specific property keys to fetch (defaults to common properties)"),
});

export async function getCue(
  conn: QLabConnection,
  args: z.infer<typeof getCueSchema>
): Promise<string> {
  const keys = args.keys ?? DEFAULT_KEYS;
  const reply = await conn.send(CueCmd.valuesForKeys(args.cue_id), JSON.stringify(keys));
  return JSON.stringify(reply.data ?? reply, null, 2);
}
