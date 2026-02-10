import type { Mode } from "./mode.tsx"

export interface CommandContextBase {
  mode: Mode
  setMode: (mode: Mode) => void
  commands: { invoke: (id: string) => void; list: () => Command[] }
  exit: () => void
}

export interface CommandContext extends CommandContextBase {
  [key: string]: any
}

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>
export type CommandWhen = (ctx: CommandContext) => boolean

export interface Command {
  id: string
  title: string
  handler: CommandHandler
  defaultHotkey?: string
  modes?: Mode[]
  when?: CommandWhen
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
