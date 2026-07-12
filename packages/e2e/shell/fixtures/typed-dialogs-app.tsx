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

function TypedDialogsApp() {
  useQuitCommand();
  const current = useCurrentOverlay();
  const ask = useAskDialog();
  const choose = useChooseDialog<Model>();
  const controllerRef = useRef<AskEditorController | null>(null);
  const [askResult, setAskResult] = useState("pending");
  const [chooseResult, setChooseResult] = useState("pending");

  useCommand({
    id: "open-ask",
    title: "Open ask dialog",
    hotkey: "a",
    modes: ["cursor"],
    handler: () => {
      void ask
        .open({
          prompt: "Type something",
          multiline: false,
          controllerRef,
          commands: [
            {
              id: "pick-model",
              title: "Pick model",
              hotkey: "ctrl+p",
              modes: ["insert", "cursor"],
              handler: () => {
                void choose
                  .open({
                    items: MODELS,
                    toItem: (model) => ({ text: model.label }),
                    prompt: "Pick a model",
                  })
                  .then((model) => {
                    setChooseResult(model === null ? "<null>" : model.id);
                    if (model !== null) controllerRef.current?.insertText(model.id);
                  });
              },
            },
          ],
        })
        .then((value) => setAskResult(value === null ? "<null>" : `[${value}]`));
    },
  });

  useCommand({
    id: "open-choose",
    title: "Open choose dialog",
    hotkey: "c",
    modes: ["cursor"],
    handler: () => {
      void choose
        .open({
          items: MODELS,
          toItem: (model) => ({ text: model.label }),
          prompt: "Pick a model",
        })
        .then((model) => setChooseResult(model === null ? "<null>" : model.id));
    },
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <text content="typed dialogs e2e ready" />
      <text content={`ask-result: ${askResult}`} />
      <text content={`choose-result: ${chooseResult}`} />
      <box style={{ flexGrow: 1, position: "relative" }}>{current}</box>
    </box>
  );
}

await launchCli(<TypedDialogsApp />, { exitOnCtrlC: true });
