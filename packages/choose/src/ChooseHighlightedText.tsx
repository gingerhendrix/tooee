import { Fragment } from "react";
import type { ReactNode } from "react";

export interface ChooseHighlightedTextProps {
  text: string;
  positions: number[];
  highlightColor: string;
}

/** Render fuzzy-match characters with one shared segmentation implementation. */
export function ChooseHighlightedText({
  text,
  positions,
  highlightColor,
}: ChooseHighlightedTextProps): ReactNode {
  if (positions.length === 0) return text;

  const positionSet = new Set(positions);
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let current = "";
  let currentHighlighted = false;

  for (let index = 0; index < text.length; index++) {
    const highlighted = positionSet.has(index);
    if (index === 0) {
      current = text[index];
      currentHighlighted = highlighted;
    } else if (highlighted === currentHighlighted) {
      current += text[index];
    } else {
      parts.push({ text: current, highlighted: currentHighlighted });
      current = text[index];
      currentHighlighted = highlighted;
    }
  }
  if (current) parts.push({ text: current, highlighted: currentHighlighted });

  return parts.map((part, index) => (
    <Fragment key={index}>
      {part.highlighted ? <span fg={highlightColor}>{part.text}</span> : part.text}
    </Fragment>
  ));
}
