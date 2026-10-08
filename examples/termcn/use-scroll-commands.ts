/** Vim-style scroll commands for a scrollbox in the active panel. */

import type { ScrollBoxRenderable } from "@opentui/core";
import { useCommand } from "@tooee/commands";
import type { RefObject } from "react";

const HALF_PAGE = 10;

export const useScrollCommands = function useScrollCommands(
  scrollRef: RefObject<ScrollBoxRenderable | null>,
  scope: string
): void {
  const scrollBy = (delta: number): void => {
    scrollRef.current?.scrollBy(delta);
  };

  useCommand({
    handler: () => {
      scrollBy(1);
    },
    hotkey: "j",
    id: `${scope}.scroll-down`,
    modes: ["cursor"],
    title: "Scroll down",
  });
  useCommand({
    handler: () => {
      scrollBy(-1);
    },
    hotkey: "k",
    id: `${scope}.scroll-up`,
    modes: ["cursor"],
    title: "Scroll up",
  });
  useCommand({
    handler: () => {
      scrollBy(HALF_PAGE);
    },
    hotkey: "ctrl+d",
    id: `${scope}.page-down`,
    modes: ["cursor"],
    title: "Half page down",
  });
  useCommand({
    handler: () => {
      scrollBy(-HALF_PAGE);
    },
    hotkey: "ctrl+u",
    id: `${scope}.page-up`,
    modes: ["cursor"],
    title: "Half page up",
  });
  useCommand({
    handler: () => {
      scrollRef.current?.scrollTo(0);
    },
    hotkey: "g g",
    id: `${scope}.top`,
    modes: ["cursor"],
    title: "Scroll to top",
  });
  useCommand({
    handler: () => {
      scrollRef.current?.scrollTo(Number.MAX_SAFE_INTEGER);
    },
    hotkey: "shift+g",
    id: `${scope}.bottom`,
    modes: ["cursor"],
    title: "Scroll to bottom",
  });
};
