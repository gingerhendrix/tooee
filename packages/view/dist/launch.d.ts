import type { ViewContentProvider, ViewInteractionHandler } from "./types.ts";
export interface ViewLaunchOptions {
    contentProvider: ViewContentProvider;
    interactionHandler?: ViewInteractionHandler;
}
export declare function launch(options: ViewLaunchOptions): Promise<void>;
//# sourceMappingURL=launch.d.ts.map