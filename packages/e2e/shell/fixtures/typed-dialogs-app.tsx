import { useRef, useState } from "react";
import { launchCli, useQuitCommand } from "@tooee/shell";
import { useCommand } from "@tooee/commands";
import { useCurrentOverlay } from "@tooee/overlays";
import { useAskDialog } from "@tooee/ask";
import type { AskEditorController } from "@tooee/ask";
import { useChooseDialog } from "@tooee/choose";

interface Model {
  id: string;
  label: string;
}

const MODELS: Model[] = [
  { id: "small", label: "Small model" },
  { id: "medium", label: "Medium model" },
  { id: "large", label: "Large model" },
];

const TypedDialogsApp = function TypedDialogsApp(): React.ReactNode {
  useQuitCommand();
  const current = useCurrentOverlay();
  const ask = useAskDialog();
  const choose = useChooseDialog<Model>();
  const controllerRef = useRef<AskEditorController | null>(null);
  const [askResult, setAskResult] = useState("pending");
  const [chooseResult, setChooseResult] = useState("pending");

  useCommand({
    handler: async () => {
      const value = await ask.open({
        commands: [
          {
            handler: async () => {
              const selectedModel = await choose.open({
                items: MODELS,
                prompt: "Pick a model",
                toItem: (item) => ({ text: item.label }),
              });
              setChooseResult(selectedModel === null ? "<null>" : selectedModel.id);
              if (selectedModel !== null) {
                controllerRef.current?.insertText(selectedModel.id);
              }
            },
            hotkey: "ctrl+p",
            id: "pick-model",
            modes: ["insert", "cursor"],
            title: "Pick model",
          },
        ],
        controllerRef,
        multiline: false,
        prompt: "Type something",
      });
      setAskResult(value === null ? "<null>" : `[${value}]`);
    },
    hotkey: "a",
    id: "open-ask",
    modes: ["cursor"],
    title: "Open ask dialog",
  });

  useCommand({
    handler: async () => {
      const selectedModel = await choose.open({
        items: MODELS,
        prompt: "Pick a model",
        toItem: (item) => ({ text: item.label }),
      });
      setChooseResult(selectedModel === null ? "<null>" : selectedModel.id);
    },
    hotkey: "c",
    id: "open-choose",
    modes: ["cursor"],
    title: "Open choose dialog",
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <text content="typed dialogs e2e ready" />
      <text content={`ask-result: ${askResult}`} />
      <text content={`choose-result: ${chooseResult}`} />
      <box style={{ flexGrow: 1, position: "relative" }}>{current}</box>
    </box>
  );
};

await launchCli(<TypedDialogsApp />, { exitOnCtrlC: true });
