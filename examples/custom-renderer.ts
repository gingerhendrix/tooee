#!/usr/bin/env bun
/**
 * custom-renderer.ts - Demonstrates custom content formats and renderers
 *
 * This example shows:
 * - Defining a custom content format ("kanban") with typed data
 * - Registering a custom ContentRenderer for the format
 * - Using CustomContent to carry structured data
 * - getTextContent() for search/copy support
 *
 * Run: bun examples/custom-renderer.ts
 * Controls: j/k scroll, c enter cursor mode, q quit, t theme picker
 */

import { createElement } from "react";
import { launch } from "@tooee/view";
import type { ContentProvider, CustomContent, ContentRendererProps } from "@tooee/view";
import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

// === Custom data types ===

interface KanbanCard {
  id: string;
  title: string;
  assignee?: string;
  priority: "low" | "medium" | "high" | "critical";
}

interface KanbanColumn {
  name: string;
  cards: KanbanCard[];
}

interface KanbanData {
  columns: KanbanColumn[];
}

// === Sample data ===

const kanbanData: KanbanData = {
  columns: [
    {
      cards: [
        { assignee: "alice", id: "T-101", priority: "medium", title: "Add dark mode support" },
        { id: "T-102", priority: "low", title: "Write API documentation" },
        { assignee: "bob", id: "T-103", priority: "low", title: "Upgrade dependencies" },
      ],
      name: "Backlog",
    },
    {
      cards: [
        { assignee: "carol", id: "T-104", priority: "critical", title: "Fix login timeout bug" },
        { assignee: "alice", id: "T-105", priority: "high", title: "Implement search feature" },
      ],
      name: "In Progress",
    },
    {
      cards: [
        { assignee: "bob", id: "T-106", priority: "medium", title: "Refactor auth middleware" },
      ],
      name: "Review",
    },
    {
      cards: [
        { assignee: "carol", id: "T-107", priority: "high", title: "Set up CI pipeline" },
        { assignee: "alice", id: "T-108", priority: "medium", title: "Create project README" },
        { assignee: "bob", id: "T-109", priority: "low", title: "Configure linting" },
      ],
      name: "Done",
    },
  ],
};

// === Custom renderer ===

const PRIORITY_INDICATORS: Record<string, string> = {
  critical: "!!!",
  high: " !! ",
  low: "    ",
  medium: "  ! ",
};

const COLUMN_WIDTH = 36;
const CARD_INNER_WIDTH = COLUMN_WIDTH - 4;

const truncateText = function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen - 1)}\u2026`;
};

const padRight = function padRight(text: string, width: number): string {
  if (text.length >= width) {
    return text.slice(0, width);
  }
  return text + " ".repeat(width - text.length);
};

const h = function h(
  tag: string,
  props: Record<string, unknown>,
  ...children: ReactNode[]
): ReactNode {
  return createElement(tag, props, ...children);
};

const KanbanRenderer = function KanbanRenderer({ content }: ContentRendererProps): ReactNode {
  const { theme } = useTheme();
  const data = (content as CustomContent<KanbanData>).data;

  const maxCards = Math.max(...data.columns.map((col) => col.cards.length));

  // Build the board as lines
  const lines: { text: string; fg?: string }[] = [];

  // Header row
  const headerLine = data.columns
    .map((col) => {
      const label = ` ${col.name} (${col.cards.length}) `;
      return padRight(label, COLUMN_WIDTH);
    })
    .join("  ");
  lines.push({ fg: theme.primary, text: headerLine });

  // Separator
  const sepLine = data.columns.map(() => "\u2500".repeat(COLUMN_WIDTH)).join("  ");
  lines.push({ fg: theme.border, text: sepLine });

  // Card rows
  for (let cardIdx = 0; cardIdx < maxCards; cardIdx += 1) {
    // Top border of card
    const topLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) {
          return " ".repeat(COLUMN_WIDTH);
        }
        return `\u250C${"\u2500".repeat(COLUMN_WIDTH - 2)}\u2510`;
      })
      .join("  ");
    lines.push({ fg: theme.border, text: topLine });

    // Card ID + priority line
    const idLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) {
          return " ".repeat(COLUMN_WIDTH);
        }
        const card = col.cards[cardIdx];
        const priority = PRIORITY_INDICATORS[card.priority] ?? "    ";
        const inner = padRight(` ${card.id} ${priority}`, CARD_INNER_WIDTH);
        return `\u2502${inner}\u2502`;
      })
      .join("  ");
    lines.push({ text: idLine });

    // Card title line
    const titleLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) {
          return " ".repeat(COLUMN_WIDTH);
        }
        const card = col.cards[cardIdx];
        const inner = padRight(
          ` ${truncateText(card.title, CARD_INNER_WIDTH - 2)} `,
          CARD_INNER_WIDTH,
        );
        return `\u2502${inner}\u2502`;
      })
      .join("  ");
    lines.push({ text: titleLine });

    // Assignee line
    const assigneeLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) {
          return " ".repeat(COLUMN_WIDTH);
        }
        const card = col.cards[cardIdx];
        const assignee = (card.assignee?.length ?? 0) > 0 ? `@${card.assignee}` : "(unassigned)";
        const inner = padRight(` ${assignee} `, CARD_INNER_WIDTH);
        return `\u2502${inner}\u2502`;
      })
      .join("  ");
    lines.push({ fg: theme.textMuted, text: assigneeLine });

    // Bottom border of card
    const bottomLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) {
          return " ".repeat(COLUMN_WIDTH);
        }
        return `\u2514${"\u2500".repeat(COLUMN_WIDTH - 2)}\u2518`;
      })
      .join("  ");
    lines.push({ fg: theme.border, text: bottomLine });

    // Spacing between cards
    if (cardIdx < maxCards - 1) {
      lines.push({ text: "" });
    }
  }

  return h(
    "box",
    { style: { flexDirection: "column", marginLeft: 1, marginTop: 1 } },
    ...lines.map(
      (line, i): ReactNode => h("text", { content: line.text, fg: line.fg ?? theme.text, key: i }),
    ),
  );
};

// === Content provider ===

const contentProvider: ContentProvider = {
  load: (): CustomContent<KanbanData> => ({
    data: kanbanData,
    format: "kanban",
    getTextContent: () =>
      // Provide text representation for search and copy
      kanbanData.columns
        .map((col) => {
          const header = `== ${col.name} (${col.cards.length}) ==`;
          const cards = col.cards
            .map(
              (card) =>
                `  ${card.id}: ${card.title} [${card.priority}]${(card.assignee?.length ?? 0) > 0 ? ` @${card.assignee}` : ""}`,
            )
            .join("\n");
          return `${header}\n${cards}`;
        })
        .join("\n\n"),
    title: "Project Board",
  }),
};

// === Launch ===

launch({
  contentProvider,
  renderers: {
    kanban: KanbanRenderer,
  },
});
