import type { AskOptions, AskInteractionHandler } from "./types.ts";
interface AskProps extends AskOptions {
    onSubmit?: (value: string) => void;
    interactionHandler?: AskInteractionHandler;
}
export declare function Ask(props: AskProps): import("react").ReactNode;
export {};
//# sourceMappingURL=Ask.d.ts.map