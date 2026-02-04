export interface ViewContent {
  body: string
  format: "markdown" | "code" | "text" | "image"
  language?: string
  title?: string
}

export interface ViewContentProvider {
  load(): Promise<ViewContent> | ViewContent
}

export interface ViewAction {
  id: string
  title: string
  hotkey?: string
  handler: (content: ViewContent) => void
}

export interface ViewInteractionHandler {
  actions: ViewAction[]
}
