import type { CursorStyleOptions } from "@opentui/core"
import { useTheme } from "@tooee/themes"
import { EditorScrollbar } from "./EditorScrollbar.js"
import type { AskEditorViewModel } from "./use-ask-editor.js"

export interface AskEditorProps {
  editor: AskEditorViewModel
}

/**
 * Presentational ask editor: the themed textarea/input plus scrollbar. All
 * behaviour lives in the view-model from `useAskEditor`.
 */
export function AskEditor({ editor }: AskEditorProps) {
  const { theme } = useTheme()

  const cursorStyle: CursorStyleOptions =
    editor.mode === "cursor"
      ? { style: "block", blinking: false }
      : { style: "line", blinking: true }
  const cursorColor = editor.mode === "cursor" ? theme.accent : theme.primary

  if (editor.multiline) {
    return (
      <box flexDirection="row" style={{ flexGrow: 1 }} onMouseScroll={editor.bumpScroll}>
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
          onSubmit={editor.submit}
          onKeyDown={editor.onEditorKeyDown}
          onPaste={editor.onEditorPaste}
          onCursorChange={editor.bumpScroll}
          onContentChange={editor.bumpScroll}
          style={{ flexGrow: 1 }}
        />
        <EditorScrollbar
          target={editor.textareaRef.current}
          revision={editor.scrollRevision}
          color={theme.textMuted}
        />
      </box>
    )
  }

  return (
    <input
      ref={editor.inputRef}
      focused={editor.focused}
      value={editor.value}
      onInput={editor.onInput}
      onSubmit={editor.submit}
      placeholder={editor.placeholder}
      textColor={theme.text}
      placeholderColor={theme.textMuted}
      cursorColor={cursorColor}
      cursorStyle={cursorStyle}
      backgroundColor="transparent"
      onKeyDown={editor.onEditorKeyDown}
      onPaste={editor.onEditorPaste}
    />
  )
}
