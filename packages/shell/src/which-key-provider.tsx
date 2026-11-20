import { useTerminalDimensions } from "@opentui/react";
import { formatStepKey, parseHotkey, useCommandRegistry, useCommandStore } from "@tooee/commands";
import type { CommandSequenceState } from "@tooee/commands";
import { truncateCells } from "@tooee/layout";
import { overlayValue, useOverlay } from "@tooee/overlays";
import type { OverlayHandle } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";
import { useSelector } from "@xstate/store-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

const OVERLAY_ID = "tooee.which-key";

export interface WhichKeyProviderProps {
  children: ReactNode;
  /** Limit automatic hints to leader sequences. Root hints are still available. */
  leaderOnly?: boolean;
}

const fallbackCandidateLabel = function fallbackCandidateLabel(
  candidate: CommandSequenceState["candidates"][number]
): string {
  if (candidate.remainingSteps.length === 1) {
    return candidate.command.title;
  }

  if (candidate.command.group !== undefined && candidate.command.group !== "") {
    return candidate.command.group;
  }

  if (candidate.command.category !== undefined && candidate.command.category !== "") {
    return candidate.command.category;
  }

  const [, step] = candidate.remainingSteps;

  return step === undefined
    ? candidate.command.title
    : `${formatStepKey(step)}… ${candidate.command.title}`;
};

const summarizeCandidates = function summarizeCandidates(
  state: CommandSequenceState
): { key: string; title: string }[] {
  const byKey = new Map<string, string[]>();

  for (const candidate of state.candidates) {
    const key = formatStepKey(candidate.nextStep);
    const label = candidate.group?.title ?? fallbackCandidateLabel(candidate);
    const values = byKey.get(key) ?? [];

    if (!values.includes(label)) {
      values.push(label);
    }

    byKey.set(key, values);
  }

  return [...byKey.entries()]
    .map(([key, titles]) => ({ key, title: titles.join(" / ") }))
    .toSorted((a, b) => a.key.localeCompare(b.key));
};

export const WhichKeyOverlay = function WhichKeyOverlay({
  state,
}: {
  state: CommandSequenceState;
}): ReactNode {
  const { theme } = useTheme();
  const { width, height } = useTerminalDimensions();
  const entries = useMemo(() => summarizeCandidates(state), [state]);
  const prefix = state.prefix.map(formatStepKey).join(" ") || "root";

  if (width < 16 || height < 7) {
    return null;
  }

  // Leave room for the app and reserve a row for the overflow count when needed.
  const innerWidth = width - 8;
  const columns = Math.max(1, Math.min(entries.length, Math.floor(innerWidth / 24)));
  const columnWidth = Math.floor(innerWidth / columns);
  const rows = Math.max(2, Math.floor(height * 0.6) - 3);
  const visibleCount = entries.length > rows * columns ? (rows - 1) * columns : entries.length;
  const hiddenCount = entries.length - visibleCount;

  return (
    <box
      position="absolute"
      left={2}
      right={2}
      bottom={1}
      flexDirection="column"
      border
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={theme.backgroundPanel}
      borderColor={theme.border}
    >
      <text fg={theme.textMuted} content={`which-key: ${prefix}`} wrapMode="none" />
      <box flexDirection="row" flexWrap="wrap">
        {entries.slice(0, visibleCount).map((entry): ReactNode => {
          const key = truncateCells(entry.key, columnWidth - 5);
          const title = truncateCells(entry.title, columnWidth - Bun.stringWidth(key) - 4);

          return (
            <text key={entry.key} width={columnWidth} height={1} wrapMode="none">
              <span fg={theme.accent}>{key}</span>
              <span fg={theme.textMuted}> → </span>
              {title}
            </text>
          );
        })}
      </box>
      {hiddenCount > 0 && <text fg={theme.textMuted} content={`… ${hiddenCount} more keys`} />}
    </box>
  );
};

export const WhichKeyProvider = function WhichKeyProvider({
  children,
  leaderOnly,
}: WhichKeyProviderProps): ReactNode {
  const commandStore = useCommandStore();

  const hints = useSelector(
    commandStore.store,
    ({ context }) => context.sequence ?? context.rootKeyHints
  );

  const { leaderKey } = useCommandRegistry();
  const overlay = useOverlay();
  const handleRef = useRef<OverlayHandle<CommandSequenceState> | null>(null);

  const leaderStep = leaderKey === undefined ? undefined : parseHotkey(leaderKey).steps[0];
  const firstStep = hints?.prefix[0];

  const shouldShow =
    hints !== null &&
    hints.candidates.length > 0 &&
    (leaderOnly !== true ||
      leaderStep === undefined ||
      firstStep === undefined ||
      formatStepKey(firstStep) === formatStepKey(leaderStep));

  useLayoutEffect(() => commandStore.enableRootKeyHints(), [commandStore]);

  useLayoutEffect(() => {
    if (!shouldShow) {
      handleRef.current?.close();

      return;
    }

    if (handleRef.current !== null) {
      handleRef.current.update(overlayValue(hints));

      return;
    }

    handleRef.current = overlay.open(
      OVERLAY_ID,
      ({ payload }): ReactNode => <WhichKeyOverlay state={payload} />,
      hints,
      {
        dismissOnEscape: false,
        onClose: () => {
          handleRef.current = null;
        },
        ownCommands: true,
        role: "passive",
      }
    );
  }, [overlay, hints, shouldShow]);

  useLayoutEffect(
    () => () => {
      handleRef.current?.close("unmounted");
    },
    []
  );

  return children;
};
