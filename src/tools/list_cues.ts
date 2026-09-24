import { z } from "zod";
import type { QLabConnection } from "../qlab/connection.js";
import type { Cue } from "../qlab/types.js";

export const listCuesSchema = z.object({
  flat: z.boolean().optional().describe("If true, flatten the cue tree into a single array"),
});

function flattenCues(cues: Cue[]): Cue[] {
  const result: Cue[] = [];
  for (const cue of cues) {
    result.push(cue);
    if (cue.children?.length) {
      result.push(...flattenCues(cue.children));
    }
  }
  return result;
}

export async function listCues(
  conn: QLabConnection,
  args: z.infer<typeof listCuesSchema>
): Promise<string> {
  const cueLists = await conn.getCueLists();

  if (args.flat) {
    return JSON.stringify(flattenCues(cueLists), null, 2);
  }

  return JSON.stringify(cueLists, null, 2);
}
