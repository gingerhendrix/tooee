import { afterEach, describe, expect, test } from "bun:test";

import { testRender } from "@tooee/test-support";
import { act } from "react";
import type { ReactNode } from "react";

import { findImageLoader, useImageSource } from "../src/image-loaders.js";
import type { ImageLoader, LoadedImage } from "../src/image-loaders.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const loadTiny: ImageLoader["load"] = async () => {
  await Promise.resolve();

  return { data: new Uint8Array([1]), height: 2, width: 3 };
};

/** Never settles, so the hook stays in its loading state. */
const loadForever: ImageLoader["load"] = async () =>
  await Promise.withResolvers<LoadedImage>().promise;

const loadFailing: ImageLoader["load"] = async () => {
  await Promise.resolve();

  throw new Error("bad svg");
};

const loaderFor = function loaderFor(
  name: string,
  suffix: string,
  load: ImageLoader["load"] = loadTiny
): ImageLoader {
  return { load, matches: (source) => source.endsWith(suffix), name };
};

describe("findImageLoader", () => {
  test("returns the first loader that matches", () => {
    const first = loaderFor("first", ".svg");
    const second = loaderFor("second", ".svg");

    expect(findImageLoader("a.svg", [first, second])).toBe(first);
  });

  test("returns undefined with no match or no loaders", () => {
    expect(findImageLoader("a.png", [loaderFor("svg", ".svg")])).toBeUndefined();
    expect(findImageLoader("a.svg", [])).toBeUndefined();
  });
});

const StateText = function StateText({
  source,
  loaders,
}: {
  source: string | Uint8Array;
  loaders?: readonly ImageLoader[];
}): ReactNode {
  const state = useImageSource(source, loaders);

  if (state.status === "ready") {
    const kind = state.source instanceof Uint8Array ? "bytes" : "original";
    const size = state.size === null ? "none" : `${state.size.width}x${state.size.height}`;

    return <text content={`ready ${kind} ${size}`} />;
  }

  if (state.status === "error") {
    return <text content={`error ${state.message}`} />;
  }

  return <text content="loading" />;
};

const renderState = async function renderState(node: ReactNode): Promise<string> {
  testSetup = await testRender(node, { height: 3, width: 40 });
  await testSetup.renderOnce();
  await act(async () => {
    await Bun.sleep(10);
  });
  await testSetup.renderOnce();

  return testSetup.captureCharFrame();
};

describe("useImageSource", () => {
  test("passes a source through when no loader matches", async () => {
    const frame = await renderState(
      <StateText source="a.png" loaders={[loaderFor("svg", ".svg")]} />
    );

    expect(frame).toContain("ready original none");
  });

  test("passes binary sources through without asking loaders", async () => {
    const frame = await renderState(
      <StateText source={new Uint8Array([1])} loaders={[loaderFor("all", "")]} />
    );

    expect(frame).toContain("ready bytes none");
  });

  test("returns the loaded bytes and intrinsic size", async () => {
    const frame = await renderState(
      <StateText source="a.svg" loaders={[loaderFor("svg", ".svg")]} />
    );

    expect(frame).toContain("ready bytes 3x2");
  });

  test("stays loading until the loader settles", async () => {
    const frame = await renderState(
      <StateText source="a.svg" loaders={[loaderFor("svg", ".svg", loadForever)]} />
    );

    expect(frame).toContain("loading");
  });

  test("reports the loader error message", async () => {
    const frame = await renderState(
      <StateText source="a.svg" loaders={[loaderFor("svg", ".svg", loadFailing)]} />
    );

    expect(frame).toContain("error bad svg");
  });

  test("aborts the load when the image unmounts", async () => {
    let signal: AbortSignal | undefined;

    const watching: ImageLoader["load"] = async (_source, options) => {
      ({ signal } = options);

      return await loadForever(_source, options);
    };

    await renderState(<StateText source="a.svg" loaders={[loaderFor("svg", ".svg", watching)]} />);
    testSetup.renderer.destroy();

    expect(signal?.aborted).toBe(true);
  });
});
