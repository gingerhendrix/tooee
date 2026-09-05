import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { formatStepKey, useCommandRegistry, useCommandSequenceState } from "@tooee/commands";
import type { CommandSequenceState } from "@tooee/commands";
import { overlayValue, useOverlay } from "@tooee/overlays";
import type { OverlayHandle } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";

const OVERLAY_ID = "tooee.which-key";

export interface WhichKeyProviderProps {
  children: ReactNode;
  leaderOnly?: boolean;
}

const fallbackCandidateLabel = function fallbackCandidateLabel(
  candidate: CommandSequenceState["candidates"][number],
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
  state: CommandSequenceState,
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
  const entries = useMemo(() => summarizeCandidates(state), [state]);
  const prefix = state.prefix.map(formatStepKey).join(" ");

  return (
    <box
      position="absolute"
      left={2}
      bottom={1}
      width="96%"
      flexDirection="column"
      border
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={theme.backgroundPanel}
      borderColor={theme.border}
    >
      <text fg={theme.textMuted} content={`which-key: ${prefix}`} />
      <box flexDirection="row" flexWrap="wrap" gap={1}>
        {entries.map(
          (entry): ReactNode => (
            <box key={entry.key} flexDirection="row" marginRight={2}>
              <text fg={theme.accent} content={entry.key} />
              <text fg={theme.textMuted} content=" → " />
              <text content={entry.title} />
            </box>
          ),
        )}
      </box>
    </box>
  );
};

export const WhichKeyProvider = function WhichKeyProvider({
  children,
  leaderOnly,
}: WhichKeyProviderProps): ReactNode {
  const sequence = useCommandSequenceState();
  const { leaderKey } = useCommandRegistry();
  const overlay = useOverlay();
  const handleRef = useRef<OverlayHandle<CommandSequenceState> | null>(null);

  const effectiveLeaderOnly = leaderOnly ?? leaderKey !== undefined;
  const shouldShow =
    sequence !== null &&
    sequence.candidates.length > 0 &&
    (!effectiveLeaderOnly ||
      leaderKey === undefined ||
      (sequence.prefix.length > 0 &&
        sequence.prefix[0] !== undefined &&
        formatStepKey(sequence.prefix[0]) === leaderKey));

  useLayoutEffect(() => {
    if (!shouldShow) {
      handleRef.current?.close();
      return;
    }

    if (handleRef.current !== null) {
      handleRef.current.update(overlayValue(sequence));
      return;
    }

    handleRef.current = overlay.open(
      OVERLAY_ID,
      ({ payload }): ReactNode => <WhichKeyOverlay state={payload} />,
      sequence,
      {
        dismissOnEscape: false,
        onClose: () => {
          handleRef.current = null;
        },
        ownCommands: true,
        role: "passive",
      },
    );
  }, [overlay, sequence, shouldShow]);

  useLayoutEffect(
    () => () => {
      handleRef.current?.close("unmounted");
    },
    [],
  );

  return children;
};
