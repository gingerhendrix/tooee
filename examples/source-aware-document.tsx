#!/usr/bin/env bun
/**
 * A complete source-aware custom document.
 *
 * Typechecked by `bun run check`. Run with:
 *   bun --conditions=@tooee/source examples/source-aware-document.tsx
 */
import { useMemo } from "react";
import { sourceLines, sourceLineAdapter } from "@tooee/renderers";
import { Document, DocumentScreen, launchCli, useDocumentController } from "@tooee/shell";

const source = `# Release notes

Document rows can retain their original source coordinates.
Right-click a row to open application-owned command entries.
`;

const SourceAwareDocument = function SourceAwareDocument({
  content,
}: {
  content: string;
}): React.ReactNode {
  const rows = useMemo(() => sourceLines(content, { sourceId: "release-notes.txt" }), [content]);

  const controller = useDocumentController({
    adapter: sourceLineAdapter,
    onRowPress: ({ index, row }) => {
      const { line } = row.source.primary.start;
      console.error(`pressed rendered row ${index}, source line ${line}`);
    },
    preserveCursorByKey: false,
    rows,
    search: {},
  });

  const activeSource = controller.activeAnchor?.source?.primary;

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
        renderRow={(row): React.ReactNode => <text content={row.text || " "} />}
      />
    </DocumentScreen>
  );
};

void launchCli(<SourceAwareDocument content={source} />);
