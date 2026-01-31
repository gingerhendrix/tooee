import { createContext, useCallback, useContext, useRef, type ReactNode } from "react"
import type { Command, CommandRegistry } from "./types.ts"

interface CommandContextValue {
  registry: CommandRegistry
  leaderKey?: string
}

const CommandContext = createContext<CommandContextValue | null>(null)

export interface CommandProviderProps {
  children: ReactNode
  leader?: string
}

export function CommandProvider({ children, leader }: CommandProviderProps) {
  const registryRef = useRef<CommandRegistry | null>(null)

  if (registryRef.current === null) {
    const commands = new Map<string, Command>()
    registryRef.current = {
      commands,
      register(command: Command) {
        commands.set(command.id, command)
        return () => {
          commands.delete(command.id)
        }
      },
      invoke(id: string) {
        const cmd = commands.get(id)
        if (cmd && (!cmd.when || cmd.when())) {
          cmd.handler()
        }
      },
    }
  }

  return (
    <CommandContext.Provider value={{ registry: registryRef.current, leaderKey: leader }}>
      {children}
    </CommandContext.Provider>
  )
}

export function useCommandContext(): { commands: Command[]; invoke: (id: string) => void } {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error("useCommandContext must be used within a CommandProvider")
  }

  const { registry } = ctx
  return {
    get commands() {
      return Array.from(registry.commands.values())
    },
    invoke: registry.invoke,
  }
}

export function useCommandRegistry(): CommandContextValue {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error("useCommandRegistry must be used within a CommandProvider")
  }
  return ctx
}
