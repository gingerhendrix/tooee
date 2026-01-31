import type { RequestContentProvider, RequestInteractionHandler } from "./types.ts";
interface RequestProps {
    contentProvider: RequestContentProvider;
    interactionHandler?: RequestInteractionHandler;
    initialInput?: string;
}
export declare function Request(props: RequestProps): import("react").ReactNode;
export {};
//# sourceMappingURL=Request.d.ts.map