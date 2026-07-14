import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useCommandRegistry, useCommandSequenceState } from "@tooee/commands";
import type { CommandSequenceState, ParsedStep } from "@tooee/commands";
import { overlayValue, useOverlay } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";

const OVERLAY_ID = "tooee.which-key";

const formatStep = function formatStep(step: ParsedStep): string {
  const modifiers = [];
  if (step.ctrl) {
    modifiers.push("ctrl");
  }
  if (step.meta) {
    modifiers.push("meta");
  }
  if (step.option) {
    modifiers.push("option");
  }
  if (step.shift) {
    modifiers.push("shift");
  }
  modifiers.push(step.key);
  return modifiers.join("+");
};

export interface WhichKeyProviderProps {
  children: ReactNode;
  leaderOnly?: boolean;
}

export const WhichKeyProvider = function WhichKeyProvider({
  children,
  leaderOnly,
}: WhichKeyProviderProps): ReactNode {
  const sequence = useCommandSequenceState();
  const { leaderKey } = useCommandRegistry();
  const overlay = useOverlay();
  const openRef = useRef(false);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const effectiveLeaderOnly = leaderOnly ?? leaderKey !== undefined;
  const shouldShow =
    sequence !== null &&
    sequence.candidates.length > 0 &&
    (!effectiveLeaderOnly ||
      leaderKey === undefined ||
      (sequence.prefix.length > 0 &&
        sequence.prefix[0] !== undefined &&
        formatStep(sequence.prefix[0]) === leaderKey));

  useLayoutEffect(() => {
    if (!shouldShow) {
      if (openRef.current || overlay.isOpen(OVERLAY_ID)) {
        overlay.hide(OVERLAY_ID);
        openRef.current = false;
      }
      return;
    }

    if (openRef.current || overlay.isOpen(OVERLAY_ID)) {
      overlay.update(OVERLAY_ID, overlayValue(sequence));
      openRef.current = true;
      return;
    }

    // Deferred(lint-sweep): preserve the top-down overlay provider composition.
    // oxlint-disable-next-line no-use-before-define -- overlay component is declared below and evaluated after mount
    overlay.open(
      OVERLAY_ID,
      ({ payload }): ReactNode => (
        // oxlint-disable-next-line no-use-before-define -- overlay component is declared below and evaluated after mount
        <WhichKeyOverlay state={payload} />
      ),
      sequence,
      {
        dismissOnEscape: false,
        ownCommands: true,
        role: "passive",
      },
    );
    openRef.current = true;
  }, [overlay, sequence, shouldShow]);

  useLayoutEffect(
    () => () => {
      const currentOverlay = overlayRef.current;
      if (openRef.current || currentOverlay.isOpen(OVERLAY_ID)) {
        currentOverlay.hide(OVERLAY_ID);
      }
    },
    [],
  );

  return children;
};

export const WhichKeyOverlay = function WhichKeyOverlay({
  state,
}: {
  state: CommandSequenceState;
}): ReactNode {
  const { theme } = useTheme();
  // Deferred(lint-sweep): preserve the deliberate top-down component organization.
  // oxlint-disable-next-line no-use-before-define -- formatter helpers are pure and evaluated after module initialization
  const entries = useMemo(() => summarizeCandidates(state), [state]);
  const prefix = state.prefix.map(formatStep).join(" ");

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

const summarizeCandidates = function summarizeCandidates(
  state: CommandSequenceState,
): { key: string; title: string }[] {
  const byKey = new Map<string, string[]>();
  for (const candidate of state.candidates) {
    const key = formatStep(candidate.nextStep);
    // Deferred(lint-sweep): preserve the deliberate top-down component organization.
    // oxlint-disable-next-line no-use-before-define -- fallback is a pure helper evaluated after module initialization
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
    : `${formatStep(step)}… ${candidate.command.title}`;
};
