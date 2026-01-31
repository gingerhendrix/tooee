import { jsx as _jsx } from "@opentui/react/jsx-runtime";
import { createContext, useContext, useRef } from "react";
const CommandContext = createContext(null);
export function CommandProvider({ children, leader }) {
    const registryRef = useRef(null);
    if (registryRef.current === null) {
        const commands = new Map();
        registryRef.current = {
            commands,
            register(command) {
                commands.set(command.id, command);
                return () => {
                    commands.delete(command.id);
                };
            },
            invoke(id) {
                const cmd = commands.get(id);
                if (cmd && (!cmd.when || cmd.when())) {
                    cmd.handler();
                }
            },
        };
    }
    return (_jsx(CommandContext, { value: { registry: registryRef.current, leaderKey: leader }, children: children }));
}
export function useCommandContext() {
    const ctx = useContext(CommandContext);
    if (!ctx) {
        throw new Error("useCommandContext must be used within a CommandProvider");
    }
    const { registry } = ctx;
    return {
        get commands() {
            return Array.from(registry.commands.values());
        },
        invoke: registry.invoke,
    };
}
export function useCommandRegistry() {
    const ctx = useContext(CommandContext);
    if (!ctx) {
        throw new Error("useCommandRegistry must be used within a CommandProvider");
    }
    return ctx;
}
//# sourceMappingURL=context.js.map