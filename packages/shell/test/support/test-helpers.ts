import type { testRender } from "../../../../test/support/test-render.ts";
import { act } from "react";

export type TestSession = Awaited<ReturnType<typeof testRender>>;

export const press = async function press(
  session: TestSession,
  key: string,
  modifiers?: { ctrl?: boolean; shift?: boolean },
) {
  await act(async () => {
    session.mockInput.pressKey(key, modifiers);
  });
  await session.renderOnce();
};

export const pressTab = async function pressTab(
  session: TestSession,
  modifiers?: { shift?: boolean },
) {
  await act(async () => {
    session.mockInput.pressTab(modifiers);
  });
  await session.renderOnce();
};

export const pressEscape = async function pressEscape(session: TestSession) {
  await act(async () => {
    session.mockInput.pressEscape();
  });
  await session.renderOnce();
};

export const pressEnter = async function pressEnter(session: TestSession) {
  await act(async () => {
    session.mockInput.pressEnter();
  });
  await session.renderOnce();
};

export const pressArrow = async function pressArrow(session: TestSession, dir: "up" | "down") {
  await act(async () => {
    session.mockInput.pressArrow(dir);
  });
  await session.renderOnce();
};
