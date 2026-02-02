import type { Mode } from "./mode.tsx"

export interface Command {
  id: string
  title: string
  handler: (ctx: any) => void | Promise<void>
  defaultHotkey?: string
  modes?: Mode[]
  when?: (ctx: any) => boolean
  category?: string
  group?: string
  icon?: string
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
