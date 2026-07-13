import type { CursorStyleOptions } from "@opentui/core";
import { useTheme } from "@tooee/themes";
import { EditorScrollbar } from "./editor-scrollbar.js";
import type { AskEditorViewModel } from "./use-ask-editor.js";

export interface AskEditorProps {
  editor: AskEditorViewModel;
}

/**
 * Presentational ask editor: the themed textarea/input plus scrollbar. All
 * behaviour lives in the view-model from `useAskEditor`.
 */
export const AskEditor = function AskEditor({ editor }: AskEditorProps): React.ReactNode {
  const { theme } = useTheme();
  const handleContentChange = editor.bumpScroll;
  const handleCursorChange = editor.bumpScroll;
  const handleInput = editor.onInput;
  const handleKeyDown = editor.onEditorKeyDown;
  const handleMouseScroll = editor.bumpScroll;
  const handlePaste = editor.onEditorPaste;
  const handleSubmit = editor.submit;

  const cursorStyle: CursorStyleOptions =
    editor.mode === "cursor"
      ? { blinking: false, style: "block" }
      : { blinking: true, style: "line" };
  const cursorColor = editor.mode === "cursor" ? theme.accent : theme.primary;

  if (editor.multiline) {
    return (
      <box flexDirection="row" style={{ flexGrow: 1 }} onMouseScroll={handleMouseScroll}>
        <textarea
          ref={editor.textareaRef}
          focused={editor.focused}
          initialValue={editor.defaultValue}
          placeholder={editor.placeholder}
          textColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={cursorColor}
          cursorStyle={cursorStyle}
          backgroundColor="transparent"
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCursorChange={handleCursorChange}
          onContentChange={handleContentChange}
          style={{ flexGrow: 1 }}
        />
        <EditorScrollbar
          target={editor.textareaRef.current}
          revision={editor.scrollRevision}
          color={theme.textMuted}
        />
      </box>
    );
  }

  return (
    <input
      ref={editor.inputRef}
      focused={editor.focused}
      value={editor.value}
      onInput={handleInput}
      onSubmit={handleSubmit}
      placeholder={editor.placeholder}
      textColor={theme.text}
      placeholderColor={theme.textMuted}
      cursorColor={cursorColor}
      cursorStyle={cursorStyle}
      backgroundColor="transparent"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  );
};
