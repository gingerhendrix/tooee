#!/usr/bin/env bun

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { useCommand } from "@tooee/commands";
import { Panel, PanelGroup } from "@tooee/panels";
import { launchCli, useQuitCommand } from "@tooee/shell";

const InsertPanelFixture = function InsertPanelFixture(): ReactNode {
  const editorRef = useRef<TextareaRenderable>(null);
  const [activePanelId, setActivePanelId] = useState("editor");
  const [value, setValue] = useState("");
  const [tabReceived, setTabReceived] = useState(false);

  useQuitCommand();
  // A root Tab binding makes the negative assertion sensitive to accidental
  // panel-to-root fall-through even though built-in panel switching is now
  // registered on panel-local surfaces.
  useCommand({
    handler: () => {
      setActivePanelId("other");
    },
    hotkey: "tab",
    id: "fixture.root-tab",
    title: "Root Tab trap",
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <PanelGroup activePanelId={activePanelId}>
        <Panel id="editor" title="Editor" initialMode="insert" style={{ flexGrow: 1 }}>
          <textarea
            ref={editorRef}
            focused
            initialValue=""
            onContentChange={() => {
              setValue(editorRef.current?.plainText ?? "");
            }}
            onKeyDown={(event) => {
              if (event.name === "tab") {
                setTabReceived(true);
              }
            }}
            style={{ flexGrow: 1 }}
          />
          <text content={`VALUE:${value}`} />
          <text content={tabReceived ? "TAB RECEIVED" : "TAB WAITING"} />
        </Panel>
        <Panel id="other" title="Other" style={{ flexGrow: 1 }}>
          <text content="OTHER PANEL" />
        </Panel>
      </PanelGroup>
    </box>
  );
};

if (import.meta.main) {
  await launchCli(<InsertPanelFixture />);
}
