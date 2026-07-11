#!/usr/bin/env bun
/**
 * A complete source-aware custom document.
 *
 * Typechecked by `bun run check`. Run with:
 *   bun --conditions=@tooee/source examples/source-aware-document.tsx
 */
import { useMemo } from "react"
import { sourceLines, sourceLineAdapter } from "@tooee/renderers"
import { Document, DocumentScreen, launchCli, useDocumentController } from "@tooee/shell"

const source = `# Release notes

Document rows can retain their original source coordinates.
Right-click a row to open application-owned command entries.
`

function SourceAwareDocument({ content }: { content: string }) {
  const rows = useMemo(() => sourceLines(content, { sourceId: "release-notes.txt" }), [content])

  const controller = useDocumentController({
    rows,
    adapter: sourceLineAdapter,
    search: {},
    preserveCursorByKey: false,
    onRowPress: ({ index, row }) => {
      const line = row.source.primary.start.line
      console.error(`pressed rendered row ${index}, source line ${line}`)
    },
  })

  const activeSource = controller.activeAnchor?.source?.primary

  return (
    <DocumentScreen
      controller={controller}
      titleBar={{ title: "Source-aware document" }}
      statusItems={[
        {
          label: "Source:",
          value: activeSource ? `${activeSource.sourceId}:${activeSource.start.line + 1}` : "-",
        },
      ]}
      context={{ kind: "text", title: "Release notes" }}
    >
      <Document
        controller={controller}
        style={{ flexGrow: 1 }}
        renderRow={(row) => <text content={row.text || " "} />}
      />
    </DocumentScreen>
  )
}

void launchCli(<SourceAwareDocument content={source} />)
