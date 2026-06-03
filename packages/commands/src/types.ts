import type { Mode } from "./mode.js"

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

export interface CommandGroup {
  id: string
  title: string
  prefix: string
  description?: string
  icon?: string
  order?: number
}

export interface RegisteredCommandGroup extends CommandGroup {
  prefixKey: string
}

export interface CommandSequenceCandidate {
  command: Command
  hotkey: string
  steps: ParsedStep[]
  remainingSteps: ParsedStep[]
  nextStep: ParsedStep
  group?: CommandGroup
}

export interface CommandSequenceState {
  prefix: ParsedStep[]
  candidates: CommandSequenceCandidate[]
}
