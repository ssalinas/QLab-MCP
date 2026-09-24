export interface OscMessage {
  address: string;
  args?: OscArg[];
}

export type OscArg =
  | { type: "s"; value: string }
  | { type: "f"; value: number }
  | { type: "i"; value: number }
  | { type: "T"; value: true }
  | { type: "F"; value: false };

export interface QLabReplyData {
  status: string;
  address?: string;
  data?: unknown;
}
