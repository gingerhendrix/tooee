import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  InputRenderable,
  KeyEvent,
  MouseEvent,
  PasteEvent,
  TextareaRenderable,
} from "@opentui/core";
import { copyToClipboard, readPrimaryText } from "@tooee/clipboard";
import {
  useActiveCommandSurface,
  useActions,
  useCommandSurfaceId,
  useLatest,
  useLazyRef,
  useMode,
  useProvideCommandContext,
  useSetMode,
} from "@tooee/commands";
import type { ActionDefinition, CommandContext, Mode } from "@tooee/commands";
import { appendAtCursor, openLineAtCursor } from "./vim-motions.js";
import type { VimMotionState } from "./vim-motions.js";

declare module "@tooee/commands" {
  interface CommandContext {
    /** Contributed by ask editors: the current input value. */
    ask: { value: string };
  }
}

/** Built-in command groups; disable one to take over its keys entirely. */
export type AskEditorCommandGroup =
  | "motions"
  | "insert-commands"
  | "copy"
  | "submit"
  | "cancel"
  | "escape";

export type AskSubmitKey = "enter" | "shift+enter" | "none";

export interface UseAskEditorOptions {
  /** Render/edit a multiline textarea instead of a single-line input (default false). */
  multiline?: boolean;
  defaultValue?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void | Promise<void>;
  /** Enables the `q` cancel command (cursor mode) when provided. */
  onCancel?: () => void;
  /** Which key submits. Default: "shift+enter" when multiline, "enter" otherwise. */
  submitKey?: AskSubmitKey;
  /** Prefix for command ids, default "ask" (e.g. "ask:move-left"). */
  commandScope?: string;
  /** Disable built-in command groups when a consumer wants full control. */
  disable?: AskEditorCommandGroup[];
  /**
   * Force the editor to blur (e.g. while a legacy overlay covers the host
   * app). ORed with the automatic suspension derived from the command-surface
   * stack; affects focus only, never command gating.
   */
  suspended?: boolean;
}

/** Programmatic text control for composites (dictation, prefill, transforms). */
export interface AskEditorController {
  /** Current text (works for input and textarea). */
  getText: () => string;
  /** Replace the buffer; optionally move cursor to end (default true). */
  setText: (text: string, opts?: { cursorToEnd?: boolean }) => void;
  /** Insert at the cursor position. */
  insertText: (text: string) => void;
  setCursorToEnd: () => void;
  submit: () => void;
  /** Current local mode (live read). */
  readonly mode: Mode;
  /** Switch insert/cursor mode; resets any pending vim motion state. */
  setMode: (mode: Mode) => void;
}

/** Everything `<AskEditor/>` needs: refs, focus, mode, handlers. */
export interface AskEditorViewModel {
  multiline: boolean;
  defaultValue?: string;
  placeholder?: string;
  /** Single-line controlled value + change handler (unused for multiline). */
  value: string;
  onInput: (value: string) => void;
  textareaRef: { current: TextareaRenderable | null };
  inputRef: { current: InputRenderable | null };
  /** Local surface mode, drives cursor styling. */
  mode: Mode;
  /** True while a modal command surface above this one owns keyboard input. */
  suspended: boolean;
  /** Editor focus: insert/cursor mode and not suspended. */
  focused: boolean;
  /** Scrollbar re-compute revision; bumped whenever the viewport may have moved. */
  scrollRevision: number;
  bumpScroll: () => void;
  /** Blocks editor input while in cursor mode (wire to onKeyDown/onPaste). */
  onEditorKeyDown: (event: KeyEvent | PasteEvent) => void;
  onEditorPaste: (event: KeyEvent | PasteEvent) => void;
  submit: () => void;
  /** Middle-click primary-selection paste; attach to the surrounding panel/container. */
  onMouseDown: (event: MouseEvent) => void;
}

export interface UseAskEditorResult {
  controller: AskEditorController;
  editor: AskEditorViewModel;
}

interface AskEditorKeymapDefinition extends Omit<ActionDefinition, "group" | "when"> {
  group: AskEditorCommandGroup;
  when?: () => boolean;
}

/**
 * Headless ask editor core: owns editor state and registers all editing
 * commands (vim motions, insert entries, submit/cancel/escape) on the nearest
 * command surface, so it works identically at the app root, inside an
 * `ownCommands` overlay, or under any `CommandSurfaceProvider`.
 */
export const useAskEditor = function useAskEditor(
  options: UseAskEditorOptions = {},
): UseAskEditorResult {
  const { multiline = false, defaultValue, placeholder, commandScope = "ask" } = options;

  const mode = useMode();
  const setMode = useSetMode();

  const [value, setValue] = useState(defaultValue ?? "");
  const textareaRef = useRef<TextareaRenderable>(null);
  const inputRef = useRef<InputRenderable>(null);
  const didPositionInitialCursorRef = useRef(false);
  const vimMotionStateRef = useRef<VimMotionState>({ pendingG: false });
  // Bumped whenever the editor viewport may have moved (cursor, content, wheel)
  // so the scrollbar thumb re-computes from the editor's internal scroll state.
  const [scrollRevision, setScrollRevision] = useState(0);
  const bumpScroll = useCallback(() => {
    setScrollRevision((r) => r + 1);
  }, []);

  const optionsRef = useLatest(options);
  const modeRef = useLatest(mode);
  const multilineRef = useLatest(multiline);
  const valueRef = useLatest(value);

  // Suspension: while a modal command surface other than our own is topmost,
  // our commands are already suspended by the surface stack; this mirrors that
  // for renderable focus so the editor blurs under a nested picker.
  const surfaceId = useCommandSurfaceId();
  const activeSurface = useActiveCommandSurface();
  const suspended =
    (options.suspended ?? false) || (activeSurface !== null && activeSurface.id !== surfaceId);

  const focused = (mode === "insert" || mode === "cursor") && !suspended;

  const preventCursorModeEditorInput = useCallback(
    (event: KeyEvent | PasteEvent) => {
      if (modeRef.current === "cursor") {
        event.preventDefault();
      }
    },
    [modeRef],
  );

  useEffect(() => {
    if (didPositionInitialCursorRef.current || (defaultValue?.length ?? 0) === 0) {
      return;
    }

    const target = multiline ? textareaRef.current : inputRef.current;
    if (!target) {
      return;
    }

    target.cursorOffset = target.plainText.length;
    didPositionInitialCursorRef.current = true;
  }, [defaultValue, multiline]);

  // Ensure the scrollbar computes once the editor ref and layout exist.
  useEffect(() => {
    bumpScroll();
  }, [bumpScroll]);

  const getTarget = useCallback(
    () => (multilineRef.current ? textareaRef.current : inputRef.current),
    [multilineRef],
  );

  // Controller mutations must be observable before React state synchronizes.
  const getText = useCallback(
    () =>
      multilineRef.current
        ? (textareaRef.current?.plainText ?? "")
        : (inputRef.current?.plainText ?? valueRef.current),
    [multilineRef, valueRef],
  );

  const submit = useCallback(() => {
    void optionsRef.current.onSubmit?.(getText());
  }, [getText, optionsRef]);

  useProvideCommandContext(() => ({ ask: { value: getText() } }));

  const enabled = useCallback(
    (group: AskEditorCommandGroup) => !(optionsRef.current.disable?.includes(group) ?? false),
    [optionsRef],
  );

  const resolveSubmitKey = useCallback((): AskSubmitKey => {
    const { current } = optionsRef;
    return current.submitKey ?? (current.multiline === true ? "shift+enter" : "enter");
  }, []);

  const copyText = useCallback(
    (text: string, emptyMessage: string, successMessage: string, ctx: CommandContext) => {
      if (text === "") {
        ctx.toast.toast({ level: "warning", message: emptyMessage });
        return;
      }
      void copyToClipboard(text);
      ctx.toast.toast({ level: "success", message: successMessage });
    },
    [],
  );

  const copyLine = useCallback(
    (ctx: CommandContext) => {
      const target = getTarget();
      if (!target) {
        copyText("", "Nothing to copy", "Copied line to clipboard", ctx);
        return;
      }
      const text = target.plainText;
      const offset = Math.min(target.cursorOffset, text.length);
      const start = offset === 0 ? 0 : text.lastIndexOf("\n", offset - 1) + 1;
      const nextNewline = text.indexOf("\n", offset);
      const end = nextNewline === -1 ? text.length : nextNewline;
      copyText(text.slice(start, end), "Nothing to copy", "Copied line to clipboard", ctx);
    },
    [copyText, getTarget],
  );
  const copyDocument = useCallback(
    (ctx: CommandContext) => {
      copyText(getText(), "Nothing to copy", "Copied document to clipboard", ctx);
    },
    [copyText, getText],
  );
  const copySelection = useCallback(
    (ctx: CommandContext) => {
      const target = getTarget();
      const text = target?.hasSelection() === true ? target.getSelectedText() : "";
      copyText(text, "Nothing selected", "Copied selection to clipboard", ctx);
    },
    [copyText, getTarget],
  );

  const enterInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false;
    setMode("insert");
  }, [setMode]);

  const appendAndEnterInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false;
    appendAtCursor(getTarget());
    setMode("insert");
  }, [getTarget, setMode]);

  const openLineAbove = useCallback(() => {
    if (!multilineRef.current) {
      return;
    }
    vimMotionStateRef.current.pendingG = false;
    openLineAtCursor(textareaRef.current, "above");
    setMode("insert");
  }, [multilineRef, setMode]);

  const openLineBelow = useCallback(() => {
    if (!multilineRef.current) {
      return;
    }
    vimMotionStateRef.current.pendingG = false;
    openLineAtCursor(textareaRef.current, "below");
    setMode("insert");
  }, [multilineRef, setMode]);

  const leaveInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false;
    setMode("cursor");
  }, [setMode]);

  const motion = useCallback(
    (run: (target: TextareaRenderable | InputRenderable) => void) => {
      const target = getTarget();
      if (target) {
        run(target);
      }
      vimMotionStateRef.current.pendingG = false;
      bumpScroll();
    },
    [getTarget, bumpScroll],
  );

  const builtInActions = useMemo<ActionDefinition[]>(() => {
    const motionAction = (
      id: string,
      hotkey: string,
      title: string,
      run: (target: TextareaRenderable | InputRenderable) => void,
    ): AskEditorKeymapDefinition => ({
      group: "motions",
      handler: () => {
        motion(run);
      },
      hidden: true,
      hotkey,
      id: `${commandScope}:${id}`,
      modes: ["cursor"],
      title,
    });
    const definitions: AskEditorKeymapDefinition[] = [
      {
        group: "copy",
        handler: copyLine,
        hidden: true,
        hotkey: "y y",
        id: `${commandScope}:copy-line`,
        modes: ["cursor"],
        title: "Copy current line",
      },
      {
        group: "copy",
        handler: copyDocument,
        hidden: true,
        hotkey: "y g",
        id: `${commandScope}:copy-document`,
        modes: ["cursor"],
        title: "Copy document",
      },
      {
        group: "copy",
        handler: copySelection,
        hidden: true,
        hotkey: "y v",
        id: `${commandScope}:copy-selection`,
        modes: ["cursor"],
        title: "Copy selection",
      },
      {
        group: "escape",
        handler: leaveInsertMode,
        hidden: true,
        hotkey: "Escape",
        id: `${commandScope}:leave-insert-mode`,
        modes: ["insert"],
        title: "Command mode",
      },
      {
        group: "cancel",
        handler: () => optionsRef.current.onCancel?.(),
        hidden: true,
        hotkey: "q",
        id: `${commandScope}:cancel`,
        modes: ["cursor"],
        title: "Cancel",
        when: () => optionsRef.current.onCancel !== undefined,
      },
      {
        group: "insert-commands",
        handler: enterInsertMode,
        hidden: true,
        hotkey: "i",
        id: `${commandScope}:insert-mode-i`,
        modes: ["cursor"],
        title: "Insert mode",
      },
      {
        group: "insert-commands",
        handler: appendAndEnterInsertMode,
        hidden: true,
        hotkey: "a",
        id: `${commandScope}:insert-mode-a`,
        modes: ["cursor"],
        title: "Append",
      },
      {
        group: "insert-commands",
        handler: openLineAbove,
        hidden: true,
        hotkey: "shift+o",
        id: `${commandScope}:open-line-above`,
        modes: ["cursor"],
        title: "Open line above",
        when: () => multilineRef.current,
      },
      {
        group: "insert-commands",
        handler: openLineBelow,
        hidden: true,
        hotkey: "o",
        id: `${commandScope}:open-line-below`,
        modes: ["cursor"],
        title: "Open line below",
        when: () => multilineRef.current,
      },
      {
        group: "submit",
        handler: submit,
        hidden: true,
        hotkey: "Enter",
        id: `${commandScope}:submit-insert`,
        modes: ["insert"],
        title: "Submit",
        when: () => resolveSubmitKey() === "enter",
      },
      {
        group: "submit",
        handler: submit,
        hidden: true,
        hotkey: "Enter",
        id: `${commandScope}:submit-cursor`,
        modes: ["cursor"],
        title: "Submit",
        when: () => resolveSubmitKey() !== "none",
      },
      {
        group: "submit",
        handler: submit,
        hidden: true,
        hotkey: "shift+Enter",
        id: `${commandScope}:submit-multiline`,
        modes: ["insert", "cursor"],
        title: "Submit",
        when: () => resolveSubmitKey() !== "none",
      },
      motionAction("move-left", "h", "Move left", (target) => {
        target.moveCursorLeft();
      }),
      motionAction("move-left-arrow", "left", "Move left", (target) => {
        target.moveCursorLeft();
      }),
      motionAction("move-right", "l", "Move right", (target) => {
        target.moveCursorRight();
      }),
      motionAction("move-right-arrow", "right", "Move right", (target) => {
        target.moveCursorRight();
      }),
      motionAction("move-down", "j", "Move down", (target) => {
        target.moveCursorDown();
      }),
      motionAction("move-down-arrow", "down", "Move down", (target) => {
        target.moveCursorDown();
      }),
      motionAction("move-up", "k", "Move up", (target) => {
        target.moveCursorUp();
      }),
      motionAction("move-up-arrow", "up", "Move up", (target) => {
        target.moveCursorUp();
      }),
      motionAction("line-home", "0", "Line home", (target) => {
        target.gotoLineHome();
      }),
      motionAction("line-home-key", "home", "Line home", (target) => {
        target.gotoLineHome();
      }),
      motionAction("line-end", "shift+4", "Line end", (target) => {
        target.gotoLineEnd();
      }),
      motionAction("line-end-key", "end", "Line end", (target) => {
        target.gotoLineEnd();
      }),
      motionAction("word-forward", "w", "Word forward", (target) => {
        target.moveWordForward();
      }),
      motionAction("word-backward", "b", "Word backward", (target) => {
        target.moveWordBackward();
      }),
      motionAction("buffer-home", "g g", "Buffer home", (target) => {
        target.gotoBufferHome();
      }),
      motionAction("buffer-end", "shift+g", "Buffer end", (target) => {
        target.gotoBufferEnd();
      }),
    ];
    return definitions.map(({ group, when, ...definition }) => ({
      ...definition,
      when: () => enabled(group) && (when?.() ?? true),
    }));
  }, [
    appendAndEnterInsertMode,
    commandScope,
    copyDocument,
    copyLine,
    copySelection,
    enabled,
    enterInsertMode,
    leaveInsertMode,
    motion,
    multilineRef,
    openLineAbove,
    openLineBelow,
    optionsRef,
    resolveSubmitKey,
    submit,
  ]);
  useActions(builtInActions);

  // Middle-click paste from primary selection
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault();
        void (async () => {
          const text = await readPrimaryText();
          if (text === undefined || text === "") {
            return;
          }
          getTarget()?.insertText(text);
        })();
      }
    },
    [getTarget],
  );

  const setText = useCallback(
    (text: string, opts?: { cursorToEnd?: boolean }) => {
      const cursorToEnd = opts?.cursorToEnd ?? true;
      if (multilineRef.current) {
        const target = textareaRef.current;
        if (!target) {
          return;
        }
        const prevOffset = target.cursorOffset;
        target.replaceText(text);
        target.cursorOffset = cursorToEnd
          ? target.plainText.length
          : Math.min(prevOffset, target.plainText.length);
      } else {
        // Route through React state (the input is controlled) and mirror onto
        // the renderable so the change takes effect before the next render.
        const target = inputRef.current;
        const prevOffset = target?.cursorOffset ?? 0;
        setValue(text);
        if (target) {
          target.value = text;
          target.cursorOffset = cursorToEnd
            ? target.plainText.length
            : Math.min(prevOffset, target.plainText.length);
        }
      }
      bumpScroll();
    },
    [bumpScroll, multilineRef],
  );

  const insertText = useCallback(
    (text: string) => {
      getTarget()?.insertText(text);
      bumpScroll();
    },
    [getTarget, bumpScroll],
  );

  const setCursorToEnd = useCallback(() => {
    const target = getTarget();
    if (!target) {
      return;
    }
    target.cursorOffset = target.plainText.length;
    bumpScroll();
  }, [getTarget, bumpScroll]);

  const setModeExternal = useCallback(
    (next: Mode) => {
      vimMotionStateRef.current.pendingG = false;
      setMode(next);
    },
    [setMode],
  );

  // Stable identity so composites can capture it in refs/effects; `mode` reads
  // live through the getter.
  const controller = useLazyRef<AskEditorController>(() => ({
    getText,
    insertText,
    get mode() {
      return modeRef.current;
    },
    setCursorToEnd,
    setMode: setModeExternal,
    setText,
    submit,
  })).current;

  return {
    controller,
    editor: {
      bumpScroll,
      defaultValue,
      focused,
      inputRef,
      mode,
      multiline,
      onEditorKeyDown: preventCursorModeEditorInput,
      onEditorPaste: preventCursorModeEditorInput,
      onInput: setValue,
      onMouseDown: handleMouseDown,
      placeholder,
      scrollRevision,
      submit,
      suspended,
      textareaRef,
      value,
    },
  };
};
