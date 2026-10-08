/**
 * Key gate for vendored demos. termcn components read keys with raw
 * `useKeyboard`, which subscribes to the key handler in OpenTUI's
 * AppContext. This provider gives the demo subtree its own key handler and
 * forwards real key events to it only while the gate is open. Tooee commands
 * and demo handlers therefore never see the same key.
 *
 * Following the AGENTS.md raw useKeyboard policy, the forwarder also stands
 * down while a Tooee overlay is open.
 */

import { KeyHandler } from "@opentui/core";
import type { KeyEvent, PasteEvent } from "@opentui/core";
import { AppContext, useAppContext } from "@opentui/react";
import { useLatest, useLazyRef } from "@tooee/commands";
import { useHasOverlay } from "@tooee/overlays";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";

interface ForwardRules {
  isOpen: () => boolean;
  isReserved: (key: KeyEvent) => boolean;
}

/** Forward key events from the real handler to the gate; returns the unsubscribe. */
const forwardKeys = function forwardKeys(
  source: KeyHandler,
  gate: KeyHandler,
  rules: ForwardRules
): () => void {
  const forwardPress = (key: KeyEvent): void => {
    if (rules.isOpen() && !rules.isReserved(key)) {
      gate.emit("keypress", key);
    }
  };

  const forwardRelease = (key: KeyEvent): void => {
    if (rules.isOpen() && !rules.isReserved(key)) {
      gate.emit("keyrelease", key);
    }
  };

  const forwardPaste = (event: PasteEvent): void => {
    if (rules.isOpen()) {
      gate.emit("paste", event);
    }
  };

  source.on("keypress", forwardPress);
  source.on("keyrelease", forwardRelease);
  source.on("paste", forwardPaste);

  return () => {
    source.off("keypress", forwardPress);
    source.off("keyrelease", forwardRelease);
    source.off("paste", forwardPaste);
  };
};

export interface GatedKeyboardProps {
  open: boolean;
  /** Keys the gate never forwards, such as the interact-mode exit key. */
  isReserved: (key: KeyEvent) => boolean;
  children: ReactNode;
}

export const GatedKeyboard = function GatedKeyboard({
  open,
  isReserved,
  children,
}: GatedKeyboardProps): ReactNode {
  const { keyHandler, renderer } = useAppContext();
  const gate = useLazyRef(() => new KeyHandler()).current;
  const hasOverlay = useHasOverlay();
  const openRef = useLatest(open && !hasOverlay);
  const reservedRef = useLatest(isReserved);

  useEffect(
    () =>
      keyHandler === null
        ? undefined
        : forwardKeys(keyHandler, gate, {
            isOpen: () => openRef.current,
            isReserved: (key) => reservedRef.current(key),
          }),
    [keyHandler, gate, openRef, reservedRef]
  );

  const value = useMemo(() => ({ keyHandler: gate, renderer }), [gate, renderer]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
