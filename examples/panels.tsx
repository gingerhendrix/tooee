#!/usr/bin/env bun
/**
 * panels.tsx - Demonstrates first-class panels (@tooee/panels).
 *
 * Two visible panels with exactly one active. The active panel's border and
 * title are highlighted (a ▸ marker plus `borderActive`), only the active
 * panel's commands dispatch, and each panel keeps its own state.
 *
 * Run:  bun examples/panels.tsx
 *
 * Global keys (cursor mode):
 *   Tab / Shift+Tab   switch the active panel (forward / backward, wraps)
 *   o                 open a modal overlay (suspends both panels)
 *   :                 command palette (shows the active panel's commands + root)
 *   t                 choose theme
 *   q                 quit
 *
 * Streams panel (left) — active:
 *   j / k             move the selection down / up
 *
 * Detail panel (right) — active: a panel-local router
 *   v                 push the "raw" view
 *   Backspace         pop back to the "overview" view
 *
 * Try switching panels and pressing j or v: the key only does something while
 * its panel is active. The two panels' state (list selection, detail router
 * stack) is preserved across switches and across opening/closing the modal.
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { CommandSurfaceProvider, useCommand } from "@tooee/commands";
import {
  Outlet,
  RouterProvider,
  createRoute,
  createRouter,
  useNavigate,
  useRouterCommands,
} from "@tooee/router";
import { Panel, PanelGroup } from "@tooee/panels";
import { AppLayout } from "@tooee/layout";
import { launchCli, useQuitCommand, useThemeCommands } from "@tooee/shell";
import { useTheme } from "@tooee/themes";

const STREAMS = ["alpha", "beta", "gamma", "delta"];

const SelectedContext = createContext("alpha");

const StreamList = function StreamList({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}): ReactNode {
  const { theme } = useTheme();
  useCommand({
    handler: () => {
      onSelect((selected + 1) % STREAMS.length);
    },
    hotkey: "j",
    id: "list.down",
    modes: ["cursor"],
    title: "Next stream",
  });
  useCommand({
    handler: () => {
      onSelect((selected - 1 + STREAMS.length) % STREAMS.length);
    },
    hotkey: "k",
    id: "list.up",
    modes: ["cursor"],
    title: "Previous stream",
  });

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      {STREAMS.map(
        (name, index): ReactNode => (
          <text
            key={name}
            content={`${index === selected ? "▸ " : "  "}${name}`}
            fg={index === selected ? theme.text : theme.textMuted}
          />
        ),
      )}
    </box>
  );
};

const DetailOverview = function DetailOverview(): ReactNode {
  const name = useContext(SelectedContext);
  const navigate = useNavigate();
  useRouterCommands();
  useCommand({
    handler: () => {
      navigate.push("raw");
    },
    hotkey: "v",
    id: "detail.raw",
    modes: ["cursor"],
    title: "View raw",
  });
  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text content={`overview: ${name}`} />
      <text content="press v -> raw" />
    </box>
  );
};

const DetailRaw = function DetailRaw(): ReactNode {
  const name = useContext(SelectedContext);
  useRouterCommands();
  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text content={`raw: ${name}`} />
      <text content="Backspace -> overview" />
    </box>
  );
};

const overviewRoute = createRoute({ component: DetailOverview, id: "overview" });
const rawRoute = createRoute({ component: DetailRaw, id: "raw" });
const detailRouter = createRouter({ defaultRoute: "overview", routes: [overviewRoute, rawRoute] });

const ModalBody = function ModalBody({ onClose }: { onClose: () => void }): ReactNode {
  const { theme } = useTheme();
  useCommand({
    handler: onClose,
    hotkey: "escape",
    id: "modal.close",
    modes: ["cursor"],
    title: "Close modal",
  });
  return (
    <box
      position="absolute"
      left="30%"
      right="30%"
      top="40%"
      flexDirection="column"
      border
      borderColor={theme.borderActive}
      backgroundColor={theme.backgroundPanel}
      title="Modal"
      paddingLeft={1}
      paddingRight={1}
    >
      <text content="MODAL OPEN" />
      <text content="panel keys are suspended — Esc to close" fg={theme.textMuted} />
    </box>
  );
};

const PanelsDemo = function PanelsDemo(): ReactNode {
  const [selected, setSelected] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useQuitCommand();
  useThemeCommands();
  useCommand({
    handler: () => {
      setModalOpen(true);
    },
    hotkey: "o",
    id: "open-modal",
    modes: ["cursor"],
    title: "Open modal overlay",
  });

  return (
    <AppLayout
      titleBar={{ title: "Panels demo" }}
      statusBar={{
        items: [
          {
            label: "keys",
            value: "Tab switch · j/k list · v detail · o modal · : palette · q quit",
          },
        ],
      }}
    >
      <box flexDirection="column" width="100%" height="100%">
        <box flexDirection="row" style={{ flexGrow: 1 }}>
          <PanelGroup defaultActivePanelId="list">
            <Panel id="list" title="Streams" style={{ width: 32 }}>
              <StreamList selected={selected} onSelect={setSelected} />
            </Panel>
            <Panel id="detail" title="Detail" style={{ flexGrow: 1 }}>
              <SelectedContext value={STREAMS[selected] ?? "alpha"}>
                <RouterProvider router={detailRouter}>
                  <Outlet />
                </RouterProvider>
              </SelectedContext>
            </Panel>
          </PanelGroup>
        </box>
      </box>
      {modalOpen && (
        <CommandSurfaceProvider id="demo-modal" role="modal">
          <ModalBody
            onClose={() => {
              setModalOpen(false);
            }}
          />
        </CommandSurfaceProvider>
      )}
    </AppLayout>
  );
};

if (import.meta.main) {
  await launchCli(<PanelsDemo />);
}
