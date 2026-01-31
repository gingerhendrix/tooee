import type { RequestContentProvider, RequestInteractionHandler } from "./types.ts";
export interface RequestLaunchOptions {
    contentProvider: RequestContentProvider;
    interactionHandler?: RequestInteractionHandler;
    initialInput?: string;
}
export declare function launch(options: RequestLaunchOptions): Promise<void>;
//# sourceMappingURL=launch.d.ts.map