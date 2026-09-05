import type { RouteParams } from "./types.js";

export interface NavigateResult {
  type: "navigate";
  route: string;
  params?: RouteParams;
  mode?: "push" | "replace";
}

export interface BackResult {
  type: "back";
}

export type ActionNavigationResult = NavigateResult | BackResult;
