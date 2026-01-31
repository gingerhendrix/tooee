import { jsx as _jsx } from "@opentui/react/jsx-runtime";
import { render } from "@opentui/react";
import { Ask } from "./Ask.tsx";
export function launch(options) {
    render(_jsx(Ask, { prompt: options.prompt, placeholder: options.placeholder, defaultValue: options.defaultValue, onSubmit: options.onSubmit, interactionHandler: options.interactionHandler }));
}
//# sourceMappingURL=launch.js.map