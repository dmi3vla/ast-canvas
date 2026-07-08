// @infinity-canvas/detail-pane
// RIGHT pane modes: empty, content, codemap, source

export type RightMode = 'empty' | 'content' | 'codemap' | 'source';

export interface DetailPaneProps {
  mode: RightMode;
  selectedNodeId: string | null;
  source?: { path: string; line: number };
}

export const PACKAGE_NAME = '@infinity-canvas/detail-pane';
