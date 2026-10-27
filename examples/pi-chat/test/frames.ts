import type { TestSession } from "@tooee/test-support";

/** How long a test may render frames while it waits for the expected content. */
export const FRAME_WAIT_MS = 3000;

/**
 * Read the current frame when no frame is in flight.
 *
 * On OpenTUI 0.6, `captureCharFrame` takes the native buffer lease. A read while a frame is
 * in flight throws `OutputBusy`. A frame can start between test steps, for example when the
 * <markdown> parser finishes and requests a render. `renderOnce` waits for an in-flight frame
 * before it renders. The renderer sets `isRendering` before a frame touches the buffer, so the
 * synchronous check before the read proves that no frame holds the lease.
 */
export const idleFrame = async function idleFrame(current: TestSession): Promise<string> {
  const deadline = Date.now() + FRAME_WAIT_MS;

  while (current.renderer.getSchedulerState().isRendering && Date.now() < deadline) {
    // oxlint-disable-next-line no-await-in-loop -- wait for each in-flight frame in turn
    await current.renderOnce();
  }

  return current.captureCharFrame();
};

/**
 * Render frames until `ready` accepts the idle frame, or until the time limit, and return the
 * last frame. The <markdown> element and images fill in on later frames, and a loaded runner
 * needs more frames than a fixed count. On timeout the caller's assertions report the frame.
 */
export const renderUntil = async function renderUntil(
  current: TestSession,
  ready: (frame: string) => boolean
): Promise<string> {
  const deadline = Date.now() + FRAME_WAIT_MS;
  let frame = await idleFrame(current);

  while (!ready(frame) && Date.now() < deadline) {
    // oxlint-disable-next-line no-await-in-loop -- each frame must finish before the next
    await current.renderOnce();
    // oxlint-disable-next-line no-await-in-loop -- give the markdown parser time between frames
    await Bun.sleep(20);
    // oxlint-disable-next-line no-await-in-loop -- read only after the frame finishes
    frame = await idleFrame(current);
  }

  return frame;
};
