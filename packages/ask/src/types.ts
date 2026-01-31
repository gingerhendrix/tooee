export interface AskOptions {
  prompt?: string
  placeholder?: string
  defaultValue?: string
}

export interface AskAction {
  id: string
  title: string
  hotkey?: string
  handler: (input: string) => void
}

export interface AskInteractionHandler {
  actions: AskAction[]
}
