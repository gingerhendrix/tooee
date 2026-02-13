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

import { createElement } from "react"
import { launch, type ContentProvider, type CustomContent, type ContentRendererProps } from "@tooee/view"
import { useTheme } from "@tooee/themes"
import type { ReactNode } from "react"

// === Custom data types ===

interface KanbanCard {
  id: string
  title: string
  assignee?: string
  priority: "low" | "medium" | "high" | "critical"
}

interface KanbanColumn {
  name: string
  cards: KanbanCard[]
}

interface KanbanData {
  columns: KanbanColumn[]
}

// === Sample data ===

const kanbanData: KanbanData = {
  columns: [
    {
      name: "Backlog",
      cards: [
        { id: "T-101", title: "Add dark mode support", assignee: "alice", priority: "medium" },
        { id: "T-102", title: "Write API documentation", priority: "low" },
        { id: "T-103", title: "Upgrade dependencies", assignee: "bob", priority: "low" },
      ],
    },
    {
      name: "In Progress",
      cards: [
        { id: "T-104", title: "Fix login timeout bug", assignee: "carol", priority: "critical" },
        { id: "T-105", title: "Implement search feature", assignee: "alice", priority: "high" },
      ],
    },
    {
      name: "Review",
      cards: [
        { id: "T-106", title: "Refactor auth middleware", assignee: "bob", priority: "medium" },
      ],
    },
    {
      name: "Done",
      cards: [
        { id: "T-107", title: "Set up CI pipeline", assignee: "carol", priority: "high" },
        { id: "T-108", title: "Create project README", assignee: "alice", priority: "medium" },
        { id: "T-109", title: "Configure linting", assignee: "bob", priority: "low" },
      ],
    },
  ],
}

// === Custom renderer ===

const PRIORITY_INDICATORS: Record<string, string> = {
  critical: "!!!",
  high: " !! ",
  medium: "  ! ",
  low: "    ",
}

const COLUMN_WIDTH = 36
const CARD_INNER_WIDTH = COLUMN_WIDTH - 4 // borders + padding

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + "\u2026"
}

function padRight(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  return text + " ".repeat(width - text.length)
}

function h(
  tag: string,
  props: Record<string, unknown>,
  ...children: ReactNode[]
): ReactNode {
  return createElement(tag, props, ...children)
}

function KanbanRenderer({ content }: ContentRendererProps): ReactNode {
  const { theme } = useTheme()
  const data = (content as CustomContent<KanbanData>).data

  const maxCards = Math.max(...data.columns.map((col) => col.cards.length))

  // Build the board as lines
  const lines: { text: string; fg?: string }[] = []

  // Header row
  const headerLine = data.columns
    .map((col) => {
      const label = ` ${col.name} (${col.cards.length}) `
      return padRight(label, COLUMN_WIDTH)
    })
    .join("  ")
  lines.push({ text: headerLine, fg: theme.primary })

  // Separator
  const sepLine = data.columns.map(() => "\u2500".repeat(COLUMN_WIDTH)).join("  ")
  lines.push({ text: sepLine, fg: theme.border })

  // Card rows
  for (let cardIdx = 0; cardIdx < maxCards; cardIdx++) {
    // Top border of card
    const topLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) return " ".repeat(COLUMN_WIDTH)
        return "\u250C" + "\u2500".repeat(COLUMN_WIDTH - 2) + "\u2510"
      })
      .join("  ")
    lines.push({ text: topLine, fg: theme.border })

    // Card ID + priority line
    const idLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) return " ".repeat(COLUMN_WIDTH)
        const card = col.cards[cardIdx]
        const priority = PRIORITY_INDICATORS[card.priority] ?? "    "
        const inner = padRight(` ${card.id} ${priority}`, CARD_INNER_WIDTH)
        return "\u2502" + inner + "\u2502"
      })
      .join("  ")
    lines.push({ text: idLine })

    // Card title line
    const titleLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) return " ".repeat(COLUMN_WIDTH)
        const card = col.cards[cardIdx]
        const inner = padRight(
          ` ${truncateText(card.title, CARD_INNER_WIDTH - 2)} `,
          CARD_INNER_WIDTH,
        )
        return "\u2502" + inner + "\u2502"
      })
      .join("  ")
    lines.push({ text: titleLine })

    // Assignee line
    const assigneeLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) return " ".repeat(COLUMN_WIDTH)
        const card = col.cards[cardIdx]
        const assignee = card.assignee ? `@${card.assignee}` : "(unassigned)"
        const inner = padRight(` ${assignee} `, CARD_INNER_WIDTH)
        return "\u2502" + inner + "\u2502"
      })
      .join("  ")
    lines.push({ text: assigneeLine, fg: theme.textMuted })

    // Bottom border of card
    const bottomLine = data.columns
      .map((col) => {
        if (cardIdx >= col.cards.length) return " ".repeat(COLUMN_WIDTH)
        return "\u2514" + "\u2500".repeat(COLUMN_WIDTH - 2) + "\u2518"
      })
      .join("  ")
    lines.push({ text: bottomLine, fg: theme.border })

    // Spacing between cards
    if (cardIdx < maxCards - 1) {
      lines.push({ text: "" })
    }
  }

  return h(
    "box",
    { style: { flexDirection: "column", marginLeft: 1, marginTop: 1 } },
    ...lines.map((line, i) =>
      h("text", { key: i, content: line.text, fg: line.fg ?? theme.text }),
    ),
  )
}

// === Content provider ===

const contentProvider: ContentProvider = {
  load: (): CustomContent<KanbanData> => ({
    format: "kanban",
    data: kanbanData,
    title: "Project Board",
    getTextContent: () => {
      // Provide text representation for search and copy
      return kanbanData.columns
        .map((col) => {
          const header = `== ${col.name} (${col.cards.length}) ==`
          const cards = col.cards
            .map(
              (card) =>
                `  ${card.id}: ${card.title} [${card.priority}]${card.assignee ? ` @${card.assignee}` : ""}`,
            )
            .join("\n")
          return `${header}\n${cards}`
        })
        .join("\n\n")
    },
  }),
}

// === Launch ===

launch({
  contentProvider,
  renderers: {
    kanban: KanbanRenderer,
  },
})
