/**
 * Live preview of the termcn demos for one component. n and p cycle the
 * demos, Enter starts interact mode, and Ctrl+G leaves it. Only the selected
 * demo is mounted.
 */

import { useCommand } from "@tooee/commands";
import { useTheme } from "@tooee/themes";
import { useState } from "react";
import type { ReactNode } from "react";

import { useTermcn } from "../context.js";
import type { ComponentEntry } from "../data/registry.js";
import { DemoHost } from "./demo-host.js";
import { demosForComponent } from "./demos.js";
import { INTERACT_EXIT_LABEL, InteractSurface } from "./interact-mode.js";
import { SYNC_COMMAND } from "./vendor.js";

export interface PreviewTabProps {
  entry: ComponentEntry;
  /** Demo names from the docs page, in page order. */
  previews: readonly string[];
}

const VendorMissing = function VendorMissing({ directory }: { directory: string }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text
        content="Live demos need the termcn source, which is not synced yet."
        fg={theme.warning}
      />
      <text content={`Expected folder: ${directory}`} fg={theme.textMuted} />
      <text
        content="Run this from the Tooee repo root, then restart the app:"
        fg={theme.text}
        marginTop={1}
      />
      <text content={`  ${SYNC_COMMAND}`} fg={theme.success} />
    </box>
  );
};

export const PreviewTab = function PreviewTab({ entry, previews }: PreviewTabProps): ReactNode {
  const { theme } = useTheme();
  const { vendor, componentNames } = useTermcn();
  const [index, setIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);

  const demos =
    vendor.status === "ready" && vendor.value.available
      ? demosForComponent(entry.name, previews, vendor.value.demos, componentNames)
      : [];

  const current = demos.length === 0 ? undefined : demos[index % demos.length];

  const step = (delta: number): void => {
    setIndex((value) => (value + delta + demos.length) % Math.max(demos.length, 1));
  };

  useCommand({
    handler: () => {
      step(1);
    },
    hotkey: "n",
    id: "preview.next-demo",
    modes: ["cursor"],
    title: "Next demo",
    when: () => demos.length > 1,
  });
  useCommand({
    handler: () => {
      step(-1);
    },
    hotkey: "p",
    id: "preview.previous-demo",
    modes: ["cursor"],
    title: "Previous demo",
    when: () => demos.length > 1,
  });
  useCommand({
    handler: () => {
      setInteracting(true);
    },
    hotkey: "enter",
    id: "preview.interact",
    modes: ["cursor"],
    title: "Interact with the demo",
    when: () => current !== undefined,
  });

  if (vendor.status !== "ready") {
    return (
      <box paddingLeft={1}>
        <text content="Checking vendor/..." fg={theme.textMuted} />
      </box>
    );
  }

  if (!vendor.value.available) {
    return <VendorMissing directory={vendor.value.directory} />;
  }

  if (current === undefined) {
    return (
      <box paddingLeft={1}>
        <text content={`termcn has no OpenTUI demo for ${entry.name}.`} fg={theme.textMuted} />
      </box>
    );
  }

  const hint = interacting
    ? `INTERACT: keys go to the demo. ${INTERACT_EXIT_LABEL} returns to Tooee.`
    : `n/p switch demo · Enter interact`;

  return (
    <box flexDirection="column" flexGrow={1}>
      {interacting && (
        <InteractSurface
          onExit={() => {
            setInteracting(false);
          }}
        />
      )}
      <box paddingLeft={1} height={1}>
        <text>
          <span fg={theme.textMuted}>{`Demo ${(index % demos.length) + 1}/${demos.length}  `}</span>
          <strong fg={theme.primary}>{current}</strong>
          <span fg={interacting ? theme.warning : theme.textMuted}>{`   ${hint}`}</span>
        </text>
      </box>
      <box
        flexGrow={1}
        marginTop={1}
        border
        borderColor={interacting ? theme.warning : theme.borderSubtle}
        overflow="hidden"
      >
        <DemoHost key={current} demo={current} interacting={interacting} />
      </box>
    </box>
  );
};
