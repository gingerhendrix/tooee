import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { useRef } from "react";
import { TooeeProvider } from "@tooee/shell";
import { useCommand, useCommandSequenceState } from "@tooee/commands";
import { useOverlay, useCurrentOverlay } from "@tooee/overlays";
import type { OverlayController } from "@tooee/overlays";
import { press } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const ChordSurface = function ChordSurface({
  generation,
  onChord,
}: {
  generation: number;
  onChord: () => void;
}): React.ReactNode {
  useCommand({ handler: onChord, hotkey: "g g", id: "s.chord", title: "Chord" });
  return <text content={`SURFACE gen:${generation}`} />;
};

let pendingLength = -1;

const SequenceProbe = function SequenceProbe() {
  // Captured to a variable: overlays render absolutely positioned and can
  // cover a probe text row in the frame.
  const sequence = useCommandSequenceState();
  pendingLength = sequence ? sequence.prefix.length : 0;
  return null;
};

const Harness = function Harness({ onChord }: { onChord: () => void }): React.ReactNode {
  const overlay = useOverlay();
  const current = useCurrentOverlay();
  const generationRef = useRef(0);

  const openSurface = (ctrl: OverlayController) => {
    const generation = generationRef.current++;
    ctrl.open(
      "chord-overlay",
      (): React.ReactNode => <ChordSurface generation={generation} onChord={onChord} />,
      null,
      { ownCommands: true, role: "modal", surfaceMode: "cursor" },
    );
  };

  useCommand({
    handler: () => openSurface(overlay),
    hotkey: "o",
    id: "open-surface",
    title: "Open surface",
  });

  return (
    <box flexDirection="column">
      <SequenceProbe />
      {current}
    </box>
  );
};

describe("F-09: same-id overlay replacement resets a pending chord (shell bridge)", () => {
  test("replacing the active ownCommands overlay mid-chord clears the sequence", async () => {
    let chordFired = 0;
    let controller: OverlayController | null = null;

    const ControllerCapture = function ControllerCapture() {
      controller = useOverlay();
      return null;
    };

    testSetup = await testRender(
      <TooeeProvider>
        <ControllerCapture />
        <Harness onChord={() => chordFired++} />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // Open the ownCommands modal overlay and start a chord on its surface.
    await press(testSetup, "o");
    expect(testSetup.captureCharFrame()).toContain("SURFACE gen:0");

    await press(testSetup, "g");
    expect(pendingLength).toBe(1);

    // Replace the overlay with a same-id entry. The CommandSurfaceProvider
    // does not remount (same id/key), so only the shell's replaced-close
    // bridge can clear the chord.
    const { act } = await import("react");
    await act(() => {
      controller!.open(
        "chord-overlay",
        (): React.ReactNode => <ChordSurface generation={99} onChord={() => chordFired++} />,
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      );
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("SURFACE gen:99");
    expect(pendingLength).toBe(0);

    // Completing the old chord must not fire; it starts a fresh chord.
    await press(testSetup, "g");
    expect(chordFired).toBe(0);
    expect(pendingLength).toBe(1);
  });
});
