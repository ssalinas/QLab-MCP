# QLab MCP

An MCP (Model Context Protocol) server that lets Claude control [QLab](https://qlab.app) via its OSC API. The primary use case is having Claude read a production script and build out the initial show file — creating audio, video, network, group, and utility cues with correct naming, numbering, and timing.

## How It Works

QLab exposes an OSC (Open Sound Control) API over TCP on port 53000. This server maintains a persistent TCP connection to QLab and exposes its capabilities as MCP tools that Claude can call.

## Setup

### Prerequisites

- [QLab 5](https://qlab.app) running on macOS (free mode works for basic audio and structure cues)
- Node.js 18+

### Install

```bash
npm install
npm run build
```

### Configure

Copy `.env.example` to `.env` and set your QLab host:

```env
QLAB_HOST=127.0.0.1   # IP of the machine running QLab
QLAB_PORT=53000        # QLab OSC port (default 53000)
QLAB_PASSCODE=         # Workspace passcode if required
```

### Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "qlab": {
      "command": "node",
      "args": ["/path/to/QLab-MCP/dist/index.js"],
      "env": {
        "QLAB_HOST": "127.0.0.1"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_workspaces` | Discover QLab workspaces on the network (Bonjour or direct IP) |
| `connect_workspace` | Connect to a specific workspace by ID |
| `list_cues` | List all cues in the workspace (tree or flat) |
| `get_cue` | Get detailed properties of a cue by uniqueID |
| `create_cue` | Create a new cue (audio, video, group, network, osc, wait, memo, etc.) |
| `edit_cue` | Edit cue properties (name, number, notes, timing, color) |
| `move_cue` | Move a cue before or after another cue |
| `group_cues` | Group a set of cues into a new group cue |
| `ungroup_cues` | Dissolve a group, moving children into the parent list |
| `delete_cue` | Delete a cue by uniqueID |
| `save_workspace` | Save the workspace to disk |
| `go` | Trigger the standing-by (next) cue |
| `stop_all` | Panic stop — halt all running cues immediately |

## Building a Show From a Script

The ideal workflow for Claude:

1. **Connect** — `list_workspaces` → `connect_workspace`
2. **Survey** — `list_cues` to see current state
3. **Analyze** — Claude reads the script, identifies scene breaks, SFX, music, video cues, lighting calls, transitions
4. **Build** — sequential `create_cue` calls for each cue in script order
5. **Organize** — `group_cues` to bundle each scene's cues under a named group
6. **Verify** — `list_cues` to confirm structure
7. **Save** — `save_workspace`

**Supported cue types:** `audio`, `video`, `camera`, `text`, `group`, `network`, `osc`, `midi`, `midi file`, `timecode`, `script`, `fade`, `devamp`, `start`, `stop`, `pause`, `load`, `reset`, `goto`, `target`, `arm`, `disarm`, `wait`, `memo`, `cue list`

## Development

```bash
npm run dev      # Run with tsx (no build needed)
npm test         # Run unit tests
npm run build    # Compile TypeScript
```

### Testing

Unit tests run without QLab using a mock TCP server:

```bash
npm test
```

Integration tests require QLab running locally on the same machine.

## Architecture

```
src/
├── index.ts              # MCP server entry point (stdio transport)
├── config.ts             # Config from env vars
├── osc/
│   ├── framing.ts        # 4-byte length-prefix TCP framing
│   ├── client.ts         # TCP OSC client with async request/reply matching
│   └── discovery.ts      # Bonjour/mDNS discovery of QLab on LAN
├── qlab/
│   ├── types.ts          # TypeScript types for cues and workspaces
│   ├── commands.ts       # OSC address builders
│   └── connection.ts     # Authenticated workspace session
└── tools/                # One file per MCP tool
```

The OSC client uses a `Map<address, Promise>` to match incoming QLab replies (which arrive at `/reply/{original_address}`) to their pending requests, enabling multiple concurrent tool calls.
