import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
import { useState } from "react";
import { useRenderer } from "@opentui/react";
import { CommandProvider, useCommand } from "@tooee/commands";
export function Ask(props) {
    return (_jsx(CommandProvider, { children: _jsx(AskInner, { ...props }) }));
}
function AskInner({ prompt, placeholder, defaultValue, onSubmit, interactionHandler }) {
    const [value, setValue] = useState(defaultValue ?? "");
    const renderer = useRenderer();
    useCommand({
        id: "cancel",
        title: "Cancel",
        hotkey: "escape",
        handler: () => {
            renderer.exit();
        },
    });
    // Register custom actions
    if (interactionHandler) {
        for (const action of interactionHandler.actions) {
            useCommand({
                id: action.id,
                title: action.title,
                hotkey: action.hotkey,
                handler: () => {
                    action.handler(value);
                },
            });
        }
    }
    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(value);
        }
        else {
            process.stdout.write(value + "\n");
        }
        renderer.exit();
    };
    return (_jsxs("box", { style: { flexDirection: "column" }, children: [prompt && (_jsx("text", { content: prompt, style: { fg: "#7aa2f7", marginBottom: 1 } })), _jsx("input", { value: value, onChange: setValue, onSubmit: handleSubmit, placeholder: placeholder, style: { fg: "#c0caf5" } })] }));
}
//# sourceMappingURL=Ask.js.map