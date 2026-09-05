import type { ReactNode } from "react";

interface EmptyReactContent {
  kind: "empty";
}

interface StringReactContent {
  kind: "string";
  value: string;
}

interface NodeReactContent {
  kind: "node";
  value: ReactNode;
}

export type DecodedReactContent = EmptyReactContent | StringReactContent | NodeReactContent;

/** Decode a public React slot once into the chooser's three rendering cases. */
export const decodeReactContent = function decodeReactContent(
  content: ReactNode,
): DecodedReactContent {
  if (content === null || content === undefined) {
    return { kind: "empty" };
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- ReactNode boundary distinguishes themed primitive text from nodes rendered by React
  if (typeof content === "string") {
    return { kind: "string", value: content };
  }
  return { kind: "node", value: content };
};
