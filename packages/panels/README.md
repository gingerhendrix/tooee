# @tooee/panels

First-class panels for Tooee: multiple visible regions with exactly one active,
each owning its commands, local mode, and optional chrome.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Model

A `PanelGroup` holds peer `Panel`s among which exactly one is active. The active
panel owns keyboard input — only its `useCommand`/`useMode` children dispatch —
and shows the active chrome. Panels stay mounted across switches, so local state,
panel-local router stacks, and per-panel mode persist. A topmost modal overlay
still suspends the whole group and returns input to the same panel on close.

Panels build on `@tooee/commands`' `"panel"` surface role: the active panel's
commands dispatch, and keys it does not handle **fall through** to the enclosing
surface in cursor/select mode, with a panel command **shadowing** a root command
of the same hotkey while active. Insert-mode panels do not fall through: typed
characters and Tab stay with the focused editor/input. See the
[`@tooee/commands` arbitration docs](../commands/README.md#command-surfaces--arbitration).

The app supplies layout (flex rows/columns); panels manage activation, command
ownership, and chrome around it — not resizing or splitting.

## Examples

```tsx
import { PanelGroup, Panel } from "@tooee/panels";

<box flexDirection="row" width="100%" height="100%">
  <PanelGroup defaultActivePanelId="list">
    <Panel id="list" title="Streams" style={{ width: 32 }}>
      <StreamList /> {/* useCommand here dispatches only while "list" is active */}
    </Panel>
    <Panel id="detail" title="Detail" style={{ flexGrow: 1 }}>
      <StreamDetail /> {/* j/k etc. dispatch only while "detail" is active */}
    </Panel>
  </PanelGroup>
</box>;
```

Run any example from the repository root:

```bash
bun examples/panels.tsx
bun examples/panels-controlled.tsx
bun examples/panels-custom-chrome.tsx
bun examples/panels-disabled.tsx
```

- [`panels.tsx`](../../examples/panels.tsx) — complete composition with
  panel-owned commands, a panel-local router, and a suspending modal.
- [`panels-controlled.tsx`](../../examples/panels-controlled.tsx) — controlled
  activation, direct selection, and group state through `usePanels()`.
- [`panels-custom-chrome.tsx`](../../examples/panels-custom-chrome.tsx) —
  `chrome="none"`, app-defined active cues, click activation, and
  `usePanelState()`.
- [`panels-disabled.tsx`](../../examples/panels-disabled.tsx) — a disabled panel,
  `switchKeys={null}`, and app-owned previous/next commands that skip it.

## `PanelGroup`

Renders no box of its own. Owns activation (controlled or uncontrolled), Tab
cycle order (source order), activation repair, and the switch commands.

| Prop                   | Default                                  | Meaning                                                                         |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `id`                   | generated                                | Stable group id (fine to omit for a single group).                              |
| `defaultActivePanelId` | first panel                              | Uncontrolled initial active panel.                                              |
| `activePanelId`        | —                                        | Controlled active panel; `null` explicitly selects none.                        |
| `onActivePanelChange`  | —                                        | Uncontrolled resolved changes, or controlled activation requests (non-null).    |
| `switchKeys`           | `{ next: "tab", previous: "shift+tab" }` | Switch hotkeys; `null` disables built-in switching.                             |
| `switchModes`          | `["cursor", "select"]`                   | Modes in which the switch keys are live (so insert-mode `Tab` reaches editors). |
| `wrap`                 | `true`                                   | Wrap from last to first.                                                        |
| `activateOnMouseDown`  | `true`                                   | Activate a panel on mouse-down (default chrome only).                           |

The `panels.next` / `panels.previous` switch commands register on every panel's
local command surface. Only the active panel's pair can dispatch or appear in
the effective palette, so sibling and nested groups cannot overwrite one
another. Their stable ids remain remappable through `keymap`.

Activation repair: when the active panel unmounts or becomes `disabled`, the
next activatable panel (else the previous, else none) takes over. A controlled
group is never repaired — a missing/disabled controlled id activates no panel.
In uncontrolled groups, `onActivePanelChange` reports the initial resolved panel,
explicit activation, switching, and repair. In controlled groups it reports a
valid activation request but does not echo prop changes. The callback remains a
non-null API: empty groups and transitions to no active panel do not emit it;
read `usePanels().activePanelId` to observe `null`.

## `Panel`

| Prop          | Default    | Meaning                                                                                                     |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `id`          | —          | Stable id; also the panel's command-surface id.                                                             |
| `title`       | —          | Chrome title (rendered with a `▸` marker + `borderActive` when active); not a palette/which-key heading.    |
| `disabled`    | `false`    | Excluded from activation/switching; renders disabled chrome, stays mounted.                                 |
| `initialMode` | `"cursor"` | Initial local mode.                                                                                         |
| `chrome`      | `"border"` | `"border"` renders a themed box; `"none"` renders no chrome (the app draws its own from `usePanelState()`). |
| `style`       | —          | Layout props forwarded to the chrome box.                                                                   |

Chrome uses existing theme tokens only (`borderActive` / `border` / `borderSubtle`,
`textMuted`, `backgroundPanel`) — no new theme keys.

## Hooks

- `usePanelState()` — `{ id, title?, isActive, activate }` for the nearest panel.
- `usePanels()` — `{ panelIds, activePanelId, activate, next, previous }` for the nearest group.
- `usePanelActive()` — `true` when inside the active panel (or when there is no enclosing panel).

## Router composition

Panels do not depend on `@tooee/router`. A router mounted **inside** a panel is
navigated independently and keeps its stack across switches; effects on a leaf
inside an inactive panel pause (screen focus is the enclosing panel's activity
ANDed with the route-chain leaf). A router **outside** the group replaces the
whole panel composition on navigation.
