#!/usr/bin/env bun
/**
 * overlay-command-surfaces.ts - Demonstrates overlay-owned command surfaces.
 *
 * This example proves the `overlay-owned-shortcuts-design.md` model:
 *
 *   1. A MODAL overlay owns keyboard input while topmost. Parent app commands
 *      are suspended even for keys the overlay does not handle (no fall-through).
 *   2. Overlay controls are ordinary `useCommand` definitions, not a separate
 *      shortcut API — the same definitions could root a standalone app.
 *   3. A MODAL overlay has its own LOCAL mode. Entering insert mode inside the
 *      overlay does not mutate the root app's mode.
 *   4. NESTED modal overlays stack: only the topmost surface handles input.
 *   5. A PASSIVE overlay renders for visuals/help but never steals keyboard
 *      focus; the root app keeps owning input.
 *
 * Run:  bun examples/overlay-command-surfaces.ts
 *
 * Root keys (cursor mode):
 *   r        increment the ROOT counter (a normal root command)
 *   o        open the Ask modal overlay
 *   p        open the passive help overlay
 *   q        quit
 *
 * Inside the Ask modal overlay:
 *   i        enter the overlay's LOCAL insert mode (root mode stays cursor)
 *   m        open the nested model-picker modal overlay
 *   Enter    submit and close
 *   Escape   cancel and close
 *   (try r and q here — they do NOTHING: root commands are suspended)
 *
 * Inside the nested model picker:
 *   j / k or up / down   move selection
 *   Enter                select the model and close the picker
 *   Escape               close the picker (returns to the Ask overlay)
 *
 * With the passive overlay open:
 *   r        still increments the ROOT counter (passive never owns input)
 *   Escape   closes the passive overlay
 */

import { createElement, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useCommand, useActiveCommandSurface, useMode, useSetMode } from "@tooee/commands";
import { useOverlay } from "@tooee/overlays";
import type { OverlayRenderArgs } from "@tooee/overlays";
import { AppLayout } from "@tooee/layout";
import { launchCli, useQuitCommand } from "@tooee/shell";
import { useTheme } from "@tooee/themes";

const h = function h(
  tag: string | ComponentType<any>,
  props: Record<string, unknown>,
  ...children: ReactNode[]
): ReactNode {
  return createElement(tag, props, ...children);
};

const MODELS = ["claude-opus", "claude-sonnet", "gpt-4o", "local-llama"];

/** Callbacks the overlays use to write results back into the root app state. */
interface DemoActions {
  onSubmit: (text: string) => void;
  onSelectModel: (model: string) => void;
  onPassiveShadow: () => void;
}

// -- Nested modal overlay: a model picker ------------------------------------

const ModelPickerBody = function ModelPickerBody({
  close,
  onSelectModel,
}: {
  close: () => void;
  onSelectModel: (model: string) => void;
}): ReactNode {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);

  const move = (delta: number) => {
    setIndex((i) => (i + delta + MODELS.length) % MODELS.length);
  };

  useCommand({
    handler: () => {
      move(-1);
    },
    hotkey: "k",
    id: "picker.up",
    title: "Up",
  });
  useCommand({
    handler: () => {
      move(-1);
    },
    hotkey: "up",
    id: "picker.up-arrow",
    title: "Up",
  });
  useCommand({
    handler: () => {
      move(1);
    },
    hotkey: "j",
    id: "picker.down",
    title: "Down",
  });
  useCommand({
    handler: () => {
      move(1);
    },
    hotkey: "down",
    id: "picker.down-arrow",
    title: "Down",
  });
  useCommand({
    handler: () => {
      onSelectModel(MODELS[index]!);
      close();
    },
    hotkey: "Enter",
    id: "picker.select",
    title: "Select model",
  });
  useCommand({
    handler: () => {
      close();
    },
    hotkey: "Escape",
    id: "picker.cancel",
    title: "Cancel",
  });

  // A nested modal panel. It is offset down/right from the Ask overlay so the
  // stacking is visible, and it paints a SOLID background so it cleanly occludes
  // whatever is behind it instead of letting text bleed through.
  return h(
    "box",
    {
      backgroundColor: theme.backgroundPanel,
      border: true,
      borderColor: theme.accent,
      flexDirection: "column",
      left: "32%",
      position: "absolute",
      right: "10%",
      top: 8,
    },
    // Title bar
    h(
      "box",
      { backgroundColor: theme.backgroundElement, paddingLeft: 1, paddingRight: 1 },
      h("text", { attributes: 1, content: "MODEL_PICKER · nested modal", fg: theme.accent }),
    ),
    // Body
    h(
      "box",
      { flexDirection: "column", paddingBottom: 1, paddingLeft: 2, paddingRight: 2, paddingTop: 1 },
      ...MODELS.map(
        (model, i): ReactNode =>
          h("text", {
            attributes: i === index ? 1 : 0,
            content: `${i === index ? "> " : "  "}${model}`,
            fg: i === index ? theme.primary : theme.text,
            key: model,
          }),
      ),
      h("text", { content: "" }),
      h("text", {
        content: "j/k or up/down move · Enter select · Escape close",
        fg: theme.textMuted,
      }),
    ),
  );
};

// -- Modal overlay: an Ask-style prompt --------------------------------------

const AskOverlayBody = function AskOverlayBody({
  close,
  actions,
}: {
  close: () => void;
  actions: DemoActions;
}): ReactNode {
  const { theme } = useTheme();
  const overlay = useOverlay();
  // Mode here is LOCAL to this command surface — not the root app's mode.
  const mode = useMode();
  const setMode = useSetMode();

  useCommand({
    handler: () => {
      setMode("insert");
    },
    hotkey: "i",
    id: "ask.insert",
    modes: ["cursor"],
    title: "Insert mode",
  });
  useCommand({
    handler: () => {
      setMode("cursor");
    },
    hotkey: "Escape",
    id: "ask.normal",
    modes: ["insert"],
    title: "Normal mode",
  });
  useCommand({
    handler: () => {
      overlay.open(
        "model-picker",
        ({ close: closePicker }: OverlayRenderArgs<null>): ReactNode =>
          h(ModelPickerBody, { close: closePicker, onSelectModel: actions.onSelectModel }),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      );
    },
    hotkey: "m",
    id: "ask.open-model-picker",
    modes: ["cursor"],
    title: "Choose model",
  });
  useCommand({
    handler: () => {
      actions.onSubmit(`question answered in ${mode} mode`);
      close();
    },
    hotkey: "Enter",
    id: "ask.submit",
    modes: ["cursor", "insert"],
    title: "Submit",
  });
  useCommand({
    handler: () => {
      close();
    },
    hotkey: "Escape",
    id: "ask.cancel",
    modes: ["cursor"],
    title: "Cancel",
  });

  // A centered modal panel with a SOLID background. Because it paints
  // theme.backgroundPanel across its whole area, it occludes the root state
  // panel underneath instead of overlapping its text.
  return h(
    "box",
    {
      backgroundColor: theme.backgroundPanel,
      border: true,
      borderColor: theme.borderActive,
      flexDirection: "column",
      left: "18%",
      position: "absolute",
      right: "18%",
      top: 4,
    },
    // Title bar
    h(
      "box",
      { backgroundColor: theme.backgroundElement, paddingLeft: 1, paddingRight: 1 },
      h("text", {
        attributes: 1,
        content: "ASK_OVERLAY · modal · owns input",
        fg: theme.primary,
      }),
    ),
    // Body
    h(
      "box",
      { flexDirection: "column", paddingBottom: 1, paddingLeft: 2, paddingRight: 2, paddingTop: 1 },
      h("text", { content: `overlay-local mode: ${mode}`, fg: theme.accent }),
      h("text", { content: "" }),
      h("text", {
        content: "i insert · m choose model · Enter submit · Escape cancel",
        fg: theme.textMuted,
      }),
      h("text", {
        content: "r and q do nothing here — root commands are suspended.",
        fg: theme.textMuted,
      }),
    ),
  );
};

// -- Passive overlay: a help panel that never owns input ---------------------

const PassiveHelpBody = function PassiveHelpBody({ actions }: { actions: DemoActions }): ReactNode {
  const { theme } = useTheme();

  // Bound to the SAME key as the root counter. Because this is a passive
  // surface it must never win arbitration — pressing `r` hits the root command.
  useCommand({
    handler: () => {
      actions.onPassiveShadow();
    },
    hotkey: "r",
    id: "passive.shadow-r",
    title: "Passive shadow",
  });

  // A passive panel pinned to the BOTTOM of the screen with a solid background.
  // It deliberately leaves the root state panel (top-left) visible, so pressing
  // `r` visibly increments the ROOT counter while this panel stays inert.
  return h(
    "box",
    {
      backgroundColor: theme.backgroundPanel,
      border: true,
      borderColor: theme.border,
      flexDirection: "column",
      left: "10%",
      position: "absolute",
      top: 15,
      width: "80%",
    },
    // Title bar
    h(
      "box",
      { backgroundColor: theme.backgroundElement, paddingLeft: 1, paddingRight: 1 },
      h("text", {
        attributes: 1,
        content: "PASSIVE_HELP · passive · never owns input",
        fg: theme.textMuted,
      }),
    ),
    // Body
    h(
      "box",
      { flexDirection: "column", paddingBottom: 1, paddingLeft: 2, paddingRight: 2, paddingTop: 1 },
      h("text", {
        content: "Press r: the ROOT counter increments (not this panel).",
        fg: theme.text,
      }),
      h("text", { content: "Press Escape to close this passive overlay.", fg: theme.text }),
    ),
  );
};

// -- Root app ----------------------------------------------------------------

export const OverlayCommandSurfacesDemo = function OverlayCommandSurfacesDemo(): ReactNode {
  const { theme } = useTheme();
  const overlay = useOverlay();
  const rootMode = useMode();
  const active = useActiveCommandSurface();

  const [rootCount, setRootCount] = useState(0);
  const [lastSubmit, setLastSubmit] = useState("none");
  const [selectedModel, setSelectedModel] = useState("none");
  const [passiveFired, setPassiveFired] = useState(0);

  useQuitCommand();

  const actions = useMemo<DemoActions>(
    () => ({
      onPassiveShadow: () => {
        setPassiveFired((n) => n + 1);
      },
      onSelectModel: (model) => {
        setSelectedModel(model);
      },
      onSubmit: (text) => {
        setLastSubmit(text);
      },
    }),
    [],
  );

  useCommand({
    handler: () => {
      setRootCount((n) => n + 1);
    },
    hotkey: "r",
    id: "root.increment",
    title: "Increment root counter",
  });

  useCommand({
    handler: () => {
      overlay.open(
        "ask",
        ({ close }: OverlayRenderArgs<null>): ReactNode => h(AskOverlayBody, { actions, close }),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      );
    },
    hotkey: "o",
    id: "root.open-ask",
    title: "Open Ask overlay",
  });

  useCommand({
    handler: () => {
      overlay.open("passive-help", (): ReactNode => h(PassiveHelpBody, { actions }), null, {
        ownCommands: true,
        role: "passive",
      });
    },
    hotkey: "p",
    id: "root.open-passive",
    title: "Open passive help",
  });

  const stateLines = [
    `active surface : ${active ? active.id : "root"}`,
    `root mode      : ${rootMode}`,
    `root counter   : ${rootCount}`,
    `last submit    : ${lastSubmit}`,
    `selected model : ${selectedModel}`,
    `passive fired  : ${passiveFired}  (should stay 0)`,
  ];

  const help = [
    "Overlay-owned command surfaces demo.",
    "",
    "r increment root counter · o open Ask modal · p open passive help · q quit",
  ];

  const content = h(
    "box",
    { style: { flexDirection: "column", paddingLeft: 2, paddingTop: 1 } },
    h("text", { attributes: 1, content: "Overlay Command Surfaces", fg: theme.primary }),
    h("text", { content: "" }),
    ...help.map(
      (line, i): ReactNode => h("text", { content: line, fg: theme.textMuted, key: `help-${i}` }),
    ),
    h("text", { content: "" }),
    h(
      "box",
      {
        style: {
          border: true,
          borderColor: theme.border,
          flexDirection: "column",
          paddingLeft: 2,
          paddingRight: 2,
        },
      },
      ...stateLines.map(
        (line, i): ReactNode => h("text", { content: line, fg: theme.text, key: `state-${i}` }),
      ),
    ),
    overlay.topId ? null : h("text", { content: "" }),
  );

  return h(
    AppLayout,
    {
      statusBar: {
        items: [
          { label: "active:", value: active ? active.id : "root" },
          { label: "root mode:", value: rootMode },
        ],
      },
      titleBar: { title: "Overlay Command Surfaces" },
    },
    content,
  );
};

if (import.meta.main) {
  await launchCli(createElement(OverlayCommandSurfacesDemo));
}
