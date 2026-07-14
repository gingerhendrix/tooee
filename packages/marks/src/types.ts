export interface MarkPosition {
  line: number;
}

export interface MarkRange {
  from: MarkPosition;
  to: MarkPosition;
}

export interface MarkStyle {
  background?: string;
  gutterBackground?: string;
  foreground?: string;
  signBefore?: string;
  signAfter?: string;
  themeColor?: string;
  className?: string;
}

export interface Mark<T = unknown> {
  id?: string;
  range: MarkRange;
  style: MarkStyle;
  data?: T;
  priority?: number;
}

export const MarkPriorities = {
  CURRENT_MATCH: 400,
  CURSOR: 500,
  DIAGNOSTIC: 150,
  SEARCH_MATCH: 100,
  SELECTION: 300,
  TOGGLED: 200,
  USER: 250,
} as const;

export type MarkPriority = (typeof MarkPriorities)[keyof typeof MarkPriorities];
