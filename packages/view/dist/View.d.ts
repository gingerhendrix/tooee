import type { ViewContentProvider, ViewInteractionHandler } from "./types.ts";
interface ViewProps {
    contentProvider: ViewContentProvider;
    interactionHandler?: ViewInteractionHandler;
}
export declare function View({ contentProvider, interactionHandler }: ViewProps): import("react").ReactNode;
export {};
//# sourceMappingURL=View.d.ts.map