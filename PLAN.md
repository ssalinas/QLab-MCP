# QLab MCP Server — Implementation Plan

## Context

QLab is professional show control software used in theater and live events. The goal is to build an MCP server that exposes Claude-callable tools for creating and editing QLab shows. The primary use case: Claude reads a production script, analyzes its structure, and builds out an initial QLab show file — creating audio, video, network, group, and utility cues with correct naming, numbering, and timing.

QLab communicates exclusively via OSC (Open Sound Control) over TCP or UDP on port 53000. There is no REST API. This server will speak OSC over a persistent TCP connection to a locally-running QLab instance.

---

## Tech Stack

**TypeScript / Node.js** with:
- `@modelcontextprotocol/sdk` — MCP server + StdioServerTransport
- `zod` — tool input schemas (MCP SDK accepts Zod `.shape` directly)
- `osc-min` — OSC binary encoding/decoding (zero deps, 37 KB, returns `DataView`)
- `bonjour-service` — pure-TS mDNS discovery of QLab on LAN (no native addons)
- `dotenv` — env config loading
- `vitest` (dev) — unit tests

**Key implementation notes learned during build:**
- `osc-min`'s `toBuffer()` returns a `DataView`, not a `Buffer` — convert with `Buffer.from(dv.buffer)`
- `osc-min` uses type names `"string"`, `"integer"`, `"float"` — but plain JS primitives (string/number) are auto-converted; prefer passing raw primitives
- MCP SDK `server.tool()` requires the `.shape` of a `ZodObject`, not the wrapped `ZodObject` itself
- `ZodEffects` (from `.refine()`) has no `.shape` — do runtime validation inside the handler instead

---

## File Structure

```
QLab-MCP/
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example              # QLAB_HOST, QLAB_PORT, QLAB_PASSCODE
├── README.md
└── src/
    ├── index.ts              # Entry point: MCP server + stdio transport
    ├── config.ts             # Config from env: host, port, passcode, timeout
    ├── osc/
    │   ├── framing.ts        # 4-byte big-endian length-prefix encode/decode
    │   ├── client.ts         # TCP socket, send/await-reply, pending Map
    │   └── discovery.ts      # Bonjour browse for _qlab._tcp services
    ├── qlab/
    │   ├── types.ts          # Cue, Workspace, CueType TypeScript types
    │   ├── commands.ts       # OSC address constants + helper builders
    │   └── connection.ts     # Authenticated workspace session wrapper
    └── tools/
        ├── registry.ts       # Registers all tools with the MCP Server
        ├── list_workspaces.ts
        ├── connect_workspace.ts
        ├── list_cues.ts
        ├── get_cue.ts
        ├── create_cue.ts
        ├── edit_cue.ts
        ├── move_cue.ts
        ├── group_cues.ts
        ├── ungroup_cues.ts
        ├── delete_cue.ts
        └── save_workspace.ts
```

---

## OSC Client Layer

### TCP Framing (`src/osc/framing.ts`)
QLab uses 4-byte big-endian length-prefixed OSC over TCP (OSC 1.1 stream framing, not SLIP).
- `encodePacket(oscBytes: Buffer): Buffer` — prepend 4-byte length header
- `decodeStream(buf: Buffer): { packets: Buffer[], remainder: Buffer }` — handles partial packets across multiple `data` events

### TCP Client (`src/osc/client.ts`)
`QLabOSCClient` wraps a `net.Socket` with:
- `accumulator: Buffer` — reassembles fragmented TCP data
- `pendingReplies: Map<string, {resolve, reject, timer}>` — keyed by OSC address of outgoing request
- `send(address, ...args): Promise<QLabReply>` — encodes OSC, writes with framing, stores pending entry with 5s timeout
- Reply matching: QLab replies arrive at `/reply/{original_address}` with a JSON payload — resolve the matching pending entry
- `sendVoid(address, ...args): void` — fire-and-forget (for `/go`, `/panic`)

### Authentication (`src/qlab/connection.ts`)
After TCP connect:
1. Send `/workspaces` → list available workspaces
2. Send `/workspace/{id}/connect` (with optional passcode arg)
3. If reply status is `"ok"` or `"connectedWithPasscode"` → mark authenticated
4. All subsequent commands prefixed with `/workspace/{id}/`

---

## MCP Tools

| Tool | OSC Commands |
|------|-------------|
| `list_workspaces` | `/workspaces` + Bonjour discovery |
| `connect_workspace` | `/workspace/{id}/connect [passcode]` |
| `list_cues` | `/workspace/{id}/cueLists` → recurse children |
| `get_cue` | `/cue/{id}/valuesForKeys [array of props]` |
| `create_cue` | `/workspace/{id}/new {type}` → set properties sequentially |
| `edit_cue` | `/cue/{id}/{property} {value}` per changed field |
| `move_cue` | `/workspace/{id}/move/{id}/before\|after/{targetId}` |
| `group_cues` | Create group cue → move each member into group |
| `ungroup_cues` | Get children → move each before group → delete group |
| `delete_cue` | `/workspace/{id}/delete/{cueId}` |
| `save_workspace` | `/workspace/{id}/save` |
| `go` | `/workspace/{id}/go` (fire-and-forget) |
| `stop_all` | `/workspace/{id}/panic` (fire-and-forget) |

### `group_cues` detail
1. `create_cue(type="group")` → get `groupId`
2. For each `cue_id` in order: `/workspace/{id}/move/{cueId}/to/0/inParent/{groupId}`

### `ungroup_cues` detail
1. Get ordered children via `/cue/{groupId}/children`
2. Move each child in reverse order `/before/{groupId}` to preserve final order
3. Delete the now-empty group

### `create_cue` input schema
```typescript
{
  type: enum('audio','video','group','network','osc','midi','script','wait','memo','fade','start','stop','goto', ...),
  name?: string,
  number?: string,
  notes?: string,
  pre_wait?: number,
  duration?: number,
  post_wait?: number,
  after_cue_id?: string,  // insert position
}
```

---

## Configuration

`src/config.ts` reads from environment / `.env`:
```
QLAB_HOST=127.0.0.1    # default
QLAB_PORT=53000         # default
QLAB_PASSCODE=          # default empty
QLAB_REPLY_TIMEOUT_MS=5000
```

Claude Desktop config in `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "qlab": {
      "command": "node",
      "args": ["/path/to/QLab-MCP/dist/index.js"],
      "env": { "QLAB_HOST": "192.168.1.50" }
    }
  }
}
```

---

## "Build a Show From a Script" Workflow

1. **Connect**: `list_workspaces` → `connect_workspace`
2. **Survey**: `list_cues` to see current state
3. **Analyze** (Claude, no tools): parse script for scene breaks, SFX, music, video, lighting calls, timing notes
4. **Build**: call `create_cue` for each cue in script order — Claude infers type from language ("SFX: door slam" → audio, "VIDEO: projection" → video, "Lights fade" → network to lighting board)
5. **Organize**: `group_cues` to bundle each scene's cues under a named group
6. **Verify**: `list_cues` to confirm structure
7. **Save**: `save_workspace`

---

## Testing

### Unit (no QLab needed)
- `test/osc/framing.test.ts` — encode/decode round-trips, partial packet accumulation
- `test/osc/client.test.ts` — mock `net.createServer`, verify send/reply matching and timeout behavior
- `test/tools/*.test.ts` — mock `QLabConnection.send`, verify Zod validation + correct OSC addresses sent

### Mock QLab server (`test/helpers/mock_qlab_server.ts`)
TCP server that responds to registered addresses with fixture JSON. Supports:
- Exact address matching via `server.on(address, handler)`
- Prefix matching via `server.onPrefix(prefix, handler)` — needed for dynamic cue IDs like `/cue/{uuid}/name`
- Unknown addresses receive no reply (enabling timeout testing)
- Tracks open sockets so `server.close()` terminates cleanly

### Integration (QLab free mode on macOS)
Run with `QLAB_HOST=127.0.0.1`, create/edit/delete real cues, verify via `list_cues`. Requires QLab 5 installed locally.

---

## Implementation Order

1. Repo bootstrap: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`
2. `src/osc/framing.ts` + unit tests
3. `src/osc/client.ts` + mock server helper + unit tests
4. `src/qlab/types.ts` + `src/qlab/commands.ts`
5. `src/qlab/connection.ts` + `src/config.ts`
6. `src/osc/discovery.ts`
7. All tools in `src/tools/` (read-only first, then mutating)
8. `src/tools/registry.ts` + `src/index.ts` — wire to MCP + stdio
9. README with setup instructions and Claude Desktop config example
