export interface NavigateResult {
  type: "navigate"
  route: string
  params?: Record<string, unknown>
  mode?: "push" | "replace"
}

export interface BackResult {
  type: "back"
}

export type ActionNavigationResult = NavigateResult | BackResult
