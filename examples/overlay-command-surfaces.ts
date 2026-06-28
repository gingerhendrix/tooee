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

import { createElement, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { useCommand, useActiveCommandSurface, useMode, useSetMode } from "@tooee/commands"
import { useOverlay, type OverlayRenderArgs } from "@tooee/overlays"
import { AppLayout } from "@tooee/layout"
import { launchCli, useQuitCommand } from "@tooee/shell"
import { useTheme } from "@tooee/themes"

function h(
  tag: string | ComponentType<any>,
  props: Record<string, unknown>,
  ...children: ReactNode[]
): ReactNode {
  return createElement(tag, props, ...children)
}

const MODELS = ["claude-opus", "claude-sonnet", "gpt-4o", "local-llama"]

/** Callbacks the overlays use to write results back into the root app state. */
interface DemoActions {
  onSubmit: (text: string) => void
  onSelectModel: (model: string) => void
  onPassiveShadow: () => void
}

// -- Nested modal overlay: a model picker ------------------------------------

function ModelPickerBody({
  close,
  onSelectModel,
}: {
  close: () => void
  onSelectModel: (model: string) => void
}): ReactNode {
  const { theme } = useTheme()
  const [index, setIndex] = useState(0)

  const move = (delta: number) => setIndex((i) => (i + delta + MODELS.length) % MODELS.length)

  useCommand({ id: "picker.up", title: "Up", hotkey: "k", handler: () => move(-1) })
  useCommand({ id: "picker.up-arrow", title: "Up", hotkey: "up", handler: () => move(-1) })
  useCommand({ id: "picker.down", title: "Down", hotkey: "j", handler: () => move(1) })
  useCommand({ id: "picker.down-arrow", title: "Down", hotkey: "down", handler: () => move(1) })
  useCommand({
    id: "picker.select",
    title: "Select model",
    hotkey: "Enter",
    handler: () => {
      onSelectModel(MODELS[index]!)
      close()
    },
  })
  useCommand({ id: "picker.cancel", title: "Cancel", hotkey: "Escape", handler: () => close() })

  // A nested modal panel. It is offset down/right from the Ask overlay so the
  // stacking is visible, and it paints a SOLID background so it cleanly occludes
  // whatever is behind it instead of letting text bleed through.
  return h(
    "box",
    {
      position: "absolute",
      left: "32%",
      right: "10%",
      top: 8,
      flexDirection: "column",
      backgroundColor: theme.backgroundPanel,
      border: true,
      borderColor: theme.accent,
    },
    // Title bar
    h(
      "box",
      { paddingLeft: 1, paddingRight: 1, backgroundColor: theme.backgroundElement },
      h("text", { content: "MODEL_PICKER · nested modal", fg: theme.accent, attributes: 1 }),
    ),
    // Body
    h(
      "box",
      { flexDirection: "column", paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 },
      ...MODELS.map((model, i) =>
        h("text", {
          key: model,
          content: `${i === index ? "> " : "  "}${model}`,
          fg: i === index ? theme.primary : theme.text,
          attributes: i === index ? 1 : 0,
        }),
      ),
      h("text", { content: "" }),
      h("text", {
        content: "j/k or up/down move · Enter select · Escape close",
        fg: theme.textMuted,
      }),
    ),
  )
}

// -- Modal overlay: an Ask-style prompt --------------------------------------

function AskOverlayBody({
  close,
  actions,
}: {
  close: () => void
  actions: DemoActions
}): ReactNode {
  const { theme } = useTheme()
  const overlay = useOverlay()
  // Mode here is LOCAL to this command surface — not the root app's mode.
  const mode = useMode()
  const setMode = useSetMode()

  useCommand({
    id: "ask.insert",
    title: "Insert mode",
    hotkey: "i",
    modes: ["cursor"],
    handler: () => setMode("insert"),
  })
  useCommand({
    id: "ask.normal",
    title: "Normal mode",
    hotkey: "Escape",
    modes: ["insert"],
    handler: () => setMode("cursor"),
  })
  useCommand({
    id: "ask.open-model-picker",
    title: "Choose model",
    hotkey: "m",
    modes: ["cursor"],
    handler: () => {
      overlay.open(
        "model-picker",
        ({ close: closePicker }: OverlayRenderArgs<null>) =>
          h(ModelPickerBody, { close: closePicker, onSelectModel: actions.onSelectModel }),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      )
    },
  })
  useCommand({
    id: "ask.submit",
    title: "Submit",
    hotkey: "Enter",
    modes: ["cursor", "insert"],
    handler: () => {
      actions.onSubmit(`question answered in ${mode} mode`)
      close()
    },
  })
  useCommand({
    id: "ask.cancel",
    title: "Cancel",
    hotkey: "Escape",
    modes: ["cursor"],
    handler: () => close(),
  })

  // A centered modal panel with a SOLID background. Because it paints
  // theme.backgroundPanel across its whole area, it occludes the root state
  // panel underneath instead of overlapping its text.
  return h(
    "box",
    {
      position: "absolute",
      left: "18%",
      right: "18%",
      top: 4,
      flexDirection: "column",
      backgroundColor: theme.backgroundPanel,
      border: true,
      borderColor: theme.borderActive,
    },
    // Title bar
    h(
      "box",
      { paddingLeft: 1, paddingRight: 1, backgroundColor: theme.backgroundElement },
      h("text", {
        content: "ASK_OVERLAY · modal · owns input",
        fg: theme.primary,
        attributes: 1,
      }),
    ),
    // Body
    h(
      "box",
      { flexDirection: "column", paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 },
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
  )
}

// -- Passive overlay: a help panel that never owns input ---------------------

function PassiveHelpBody({ actions }: { actions: DemoActions }): ReactNode {
  const { theme } = useTheme()

  // Bound to the SAME key as the root counter. Because this is a passive
  // surface it must never win arbitration — pressing `r` hits the root command.
  useCommand({
    id: "passive.shadow-r",
    title: "Passive shadow",
    hotkey: "r",
    handler: () => actions.onPassiveShadow(),
  })

  // A passive panel pinned to the BOTTOM of the screen with a solid background.
  // It deliberately leaves the root state panel (top-left) visible, so pressing
  // `r` visibly increments the ROOT counter while this panel stays inert.
  return h(
    "box",
    {
      position: "absolute",
      left: "10%",
      width: "80%",
      top: 15,
      flexDirection: "column",
      backgroundColor: theme.backgroundPanel,
      border: true,
      borderColor: theme.border,
    },
    // Title bar
    h(
      "box",
      { paddingLeft: 1, paddingRight: 1, backgroundColor: theme.backgroundElement },
      h("text", {
        content: "PASSIVE_HELP · passive · never owns input",
        fg: theme.textMuted,
        attributes: 1,
      }),
    ),
    // Body
    h(
      "box",
      { flexDirection: "column", paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 },
      h("text", {
        content: "Press r: the ROOT counter increments (not this panel).",
        fg: theme.text,
      }),
      h("text", { content: "Press Escape to close this passive overlay.", fg: theme.text }),
    ),
  )
}

// -- Root app ----------------------------------------------------------------

export function OverlayCommandSurfacesDemo(): ReactNode {
  const { theme } = useTheme()
  const overlay = useOverlay()
  const rootMode = useMode()
  const active = useActiveCommandSurface()

  const [rootCount, setRootCount] = useState(0)
  const [lastSubmit, setLastSubmit] = useState("none")
  const [selectedModel, setSelectedModel] = useState("none")
  const [passiveFired, setPassiveFired] = useState(0)

  useQuitCommand()

  const actions = useMemo<DemoActions>(
    () => ({
      onSubmit: (text) => setLastSubmit(text),
      onSelectModel: (model) => setSelectedModel(model),
      onPassiveShadow: () => setPassiveFired((n) => n + 1),
    }),
    [],
  )

  useCommand({
    id: "root.increment",
    title: "Increment root counter",
    hotkey: "r",
    handler: () => setRootCount((n) => n + 1),
  })

  useCommand({
    id: "root.open-ask",
    title: "Open Ask overlay",
    hotkey: "o",
    handler: () => {
      overlay.open(
        "ask",
        ({ close }: OverlayRenderArgs<null>) => h(AskOverlayBody, { close, actions }),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      )
    },
  })

  useCommand({
    id: "root.open-passive",
    title: "Open passive help",
    hotkey: "p",
    handler: () => {
      overlay.open("passive-help", () => h(PassiveHelpBody, { actions }), null, {
        ownCommands: true,
        role: "passive",
      })
    },
  })

  const stateLines = [
    `active surface : ${active ? active.id : "root"}`,
    `root mode      : ${rootMode}`,
    `root counter   : ${rootCount}`,
    `last submit    : ${lastSubmit}`,
    `selected model : ${selectedModel}`,
    `passive fired  : ${passiveFired}  (should stay 0)`,
  ]

  const help = [
    "Overlay-owned command surfaces demo.",
    "",
    "r increment root counter · o open Ask modal · p open passive help · q quit",
  ]

  const content = h(
    "box",
    { style: { flexDirection: "column", paddingLeft: 2, paddingTop: 1 } },
    h("text", { content: "Overlay Command Surfaces", fg: theme.primary, attributes: 1 }),
    h("text", { content: "" }),
    ...help.map((line, i) => h("text", { key: `help-${i}`, content: line, fg: theme.textMuted })),
    h("text", { content: "" }),
    h(
      "box",
      {
        style: {
          flexDirection: "column",
          border: true,
          borderColor: theme.border,
          paddingLeft: 2,
          paddingRight: 2,
        },
      },
      ...stateLines.map((line, i) =>
        h("text", { key: `state-${i}`, content: line, fg: theme.text }),
      ),
    ),
    overlay.topId ? null : h("text", { content: "" }),
  )

  return h(
    AppLayout,
    {
      titleBar: { title: "Overlay Command Surfaces" },
      statusBar: {
        items: [
          { label: "active:", value: active ? active.id : "root" },
          { label: "root mode:", value: rootMode },
        ],
      },
    },
    content,
  )
}

if (import.meta.main) {
  await launchCli(createElement(OverlayCommandSurfacesDemo))
}
