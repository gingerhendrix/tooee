// Test fixture: a demo that throws while rendering.
import type { ReactNode } from "react";

export const KeyEchoBroken = function KeyEchoBroken(): ReactNode {
  throw new Error("fixture demo exploded");
};
