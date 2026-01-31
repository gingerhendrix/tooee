import type { AskOptions, AskInteractionHandler } from "./types.ts";
export interface AskLaunchOptions extends AskOptions {
    onSubmit?: (value: string) => void;
    interactionHandler?: AskInteractionHandler;
}
export declare function launch(options: AskLaunchOptions): Promise<void>;
//# sourceMappingURL=launch.d.ts.map