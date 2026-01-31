import { jsx as _jsx } from "@opentui/react/jsx-runtime";
import { render } from "@opentui/react";
import { View } from "./View.tsx";
export function launch(options) {
    render(_jsx(View, { contentProvider: options.contentProvider, interactionHandler: options.interactionHandler }));
}
//# sourceMappingURL=launch.js.map