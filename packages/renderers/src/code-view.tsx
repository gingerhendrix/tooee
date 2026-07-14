import { useTheme } from "@tooee/themes";
import type { DocumentBindings } from "./document-bindings.js";
import { DEFAULT_SIGN_COLUMN_WIDTH } from "./row-document-renderable.js";
import { useGutterPalette } from "./use-gutter-palette.js";
import "./row-document.js";

interface CodeViewProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  /**
   * Binds the row document to a document controller: its ref, the decoration
   * layers to paint, and the mouse handler. Rows are source lines. Omit it to
   * render a static, non-interactive listing.
   *
   * The code view renders one `<code>` provider (no per-line children), so
   * per-child mouse handlers are impossible; clicks bubble up to the
   * row-document, where the controller resolves screen-Y to a row (gutter
   * clicks included).
   */
  document?: DocumentBindings;
}

export const CodeView = function CodeView({
  content,
  language,
  showLineNumbers = true,
  document,
}: CodeViewProps): React.ReactNode {
  const { syntax } = useTheme();
  const palette = useGutterPalette();

  return (
    <row-document
      ref={document?.ref}
      showLineNumbers={showLineNumbers}
      palette={palette}
      decorations={document?.decorations}
      signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
      style={{ flexGrow: 1 }}
      onMouseDown={document?.onMouseDown}
    >
      <code content={content} filetype={language} syntaxStyle={syntax} />
    </row-document>
  );
};
