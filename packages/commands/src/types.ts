export interface Command {
  id: string
  title: string
  handler: () => void
  hotkey?: string
  category?: string
  icon?: string
  when?: () => boolean
  hidden?: boolean
}

export interface ParsedHotkey {
  steps: ParsedStep[]
}

export interface ParsedStep {
  key: string
  ctrl: boolean
  meta: boolean
  shift: boolean
  option: boolean
}

export interface CommandRegistry {
  commands: Map<string, Command>
  register: (command: Command) => () => void
  invoke: (id: string) => void
}
