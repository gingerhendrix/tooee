import { jsx as _jsx } from "@opentui/react/jsx-runtime";
import { render } from "@opentui/react";
import { Request } from "./Request.tsx";
export function launch(options) {
    render(_jsx(Request, { contentProvider: options.contentProvider, interactionHandler: options.interactionHandler, initialInput: options.initialInput }));
}
//# sourceMappingURL=launch.js.map