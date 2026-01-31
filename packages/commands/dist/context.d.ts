import { type ReactNode } from "react";
import type { Command, CommandRegistry } from "./types.ts";
interface CommandContextValue {
    registry: CommandRegistry;
    leaderKey?: string;
}
export interface CommandProviderProps {
    children: ReactNode;
    leader?: string;
}
export declare function CommandProvider({ children, leader }: CommandProviderProps): ReactNode;
export declare function useCommandContext(): {
    commands: Command[];
    invoke: (id: string) => void;
};
export declare function useCommandRegistry(): CommandContextValue;
export {};
//# sourceMappingURL=context.d.ts.map