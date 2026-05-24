export function addr(workspaceId: string, ...parts: string[]): string {
  return `/workspace/${workspaceId}/${parts.join("/")}`;
}

export function cueAddr(cueId: string, ...parts: string[]): string {
  return `/cue/${cueId}/${parts.join("/")}`;
}

export const WORKSPACES = "/workspaces";

export const Workspace = {
  connect: (id: string) => `/workspace/${id}/connect`,
  save: (id: string) => addr(id, "save"),
  go: (id: string) => addr(id, "go"),
  panic: (id: string) => addr(id, "panic"),
  cueLists: (id: string) => addr(id, "cueLists"),
  newCue: (id: string) => addr(id, "new"),
  moveCue: (id: string, cueId: string) => addr(id, "move", cueId),
  deleteCue: (id: string, cueId: string) => addr(id, "delete", cueId),
};

export const Cue = {
  name: (id: string) => cueAddr(id, "name"),
  number: (id: string) => cueAddr(id, "number"),
  notes: (id: string) => cueAddr(id, "notes"),
  preWait: (id: string) => cueAddr(id, "preWait"),
  duration: (id: string) => cueAddr(id, "duration"),
  postWait: (id: string) => cueAddr(id, "postWait"),
  colorName: (id: string) => cueAddr(id, "colorName"),
  valuesForKeys: (id: string) => cueAddr(id, "valuesForKeys"),
  children: (id: string) => cueAddr(id, "children"),
};
