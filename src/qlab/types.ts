export const CUE_TYPES = [
  "audio",
  "video",
  "camera",
  "text",
  "group",
  "network",
  "osc",
  "midi",
  "midi file",
  "timecode",
  "script",
  "fade",
  "devamp",
  "start",
  "stop",
  "pause",
  "load",
  "reset",
  "goto",
  "target",
  "arm",
  "disarm",
  "wait",
  "memo",
  "cue list",
] as const;

export type CueType = (typeof CUE_TYPES)[number];

export interface Workspace {
  uniqueID: string;
  displayName: string;
  hasPasscode: boolean;
  version?: string;
}

export interface Cue {
  uniqueID: string;
  type: CueType;
  number: string;
  name: string;
  notes?: string;
  duration?: number;
  preWait?: number;
  postWait?: number;
  colorName?: string;
  isBroken?: boolean;
  isRunning?: boolean;
  children?: Cue[];
}

export const CUE_COLORS = ["red", "orange", "green", "blue", "purple", "white", "none"] as const;
export type CueColor = (typeof CUE_COLORS)[number];
