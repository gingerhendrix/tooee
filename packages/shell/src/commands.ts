import { useRenderer } from "@opentui/react";
import { copyToClipboard, readClipboardText, readPrimaryText } from "@tooee/clipboard";
import { useCommand } from "@tooee/commands";
import type { CommandWhen } from "@tooee/commands";
import { useToast } from "@tooee/toasts";
import { useThemePicker } from "./theme-picker.js";
import type { ThemePickerState } from "./theme-picker.js";

export interface UseThemeCommandsOptions {
  when?: CommandWhen;
  /** Register the theme command (default true). The returned name stays live either way. */
  enabled?: boolean;
}

export interface UseQuitCommandOptions {
  hotkey?: string;
  when?: CommandWhen;
  onQuit?: () => void;
  /** Register the quit command (default true). */
  enabled?: boolean;
}

export const useThemeCommands = function useThemeCommands(opts?: UseThemeCommandsOptions): {
  name: string;
  picker: ThemePickerState;
} {
  const picker = useThemePicker();
  const { toast } = useToast();

  // Wrap picker.confirm to toast on theme selection (event-driven, not effect-driven)
  const confirmedPicker: ThemePickerState = {
    ...picker,
    confirm: (name: string) => {
      picker.confirm(name);
      toast({ id: "theme-changed", level: "info", message: `Theme: ${name}` });
    },
  };

  useCommand({
    enabled: opts?.enabled,
    handler: () => {
      picker.open();
    },
    hotkey: "t",
    id: "cycle-theme",
    title: "Choose theme",
    when: opts?.when,
  });

  return { name: picker.currentTheme, picker: confirmedPicker };
};

export const useQuitCommand = function useQuitCommand(opts?: UseQuitCommandOptions) {
  const renderer = useRenderer();

  useCommand({
    enabled: opts?.enabled,
    handler: () => {
      if (opts?.onQuit) {
        opts.onQuit();
      } else {
        renderer.destroy();
      }
    },
    hotkey: opts?.hotkey ?? "q",
    id: "quit",
    title: "Quit",
    when: opts?.when,
  });
};

export const useCopyCommand = function useCopyCommand(opts: {
  getText: () => string | undefined;
  when?: CommandWhen;
}) {
  useCommand({
    handler: (ctx) => {
      const text = opts.getText();
      if (text !== undefined && text !== "") {
        void copyToClipboard(text);
        ctx.toast.toast({ level: "success", message: "Copied to clipboard" });
      } else {
        ctx.toast.toast({ level: "warning", message: "Nothing to copy" });
      }
    },
    hotkey: "y",
    id: "copy",
    title: "Copy to clipboard",
    when: opts.when,
  });
};

export const usePasteCommands = function usePasteCommands(opts: {
  getTarget: () => { insertText: (text: string) => void } | null;
  when?: CommandWhen;
}) {
  useCommand({
    handler: (ctx) => {
      const target = opts.getTarget();
      if (!target) {
        return;
      }
      void readClipboardText().then((text) => {
        if (text !== undefined && text !== "") {
          target.insertText(text);
        } else {
          ctx.toast.toast({ level: "warning", message: "Clipboard empty" });
        }
      });
    },
    hotkey: "p",
    id: "paste-clipboard",
    title: "Paste from clipboard",
    when: opts.when,
  });

  useCommand({
    handler: (ctx) => {
      const target = opts.getTarget();
      if (!target) {
        return;
      }
      void readPrimaryText().then((text) => {
        if (text !== undefined && text !== "") {
          target.insertText(text);
        } else {
          ctx.toast.toast({ level: "warning", message: "Selection empty" });
        }
      });
    },
    id: "paste-primary",
    title: "Paste from selection",
    when: opts.when,
  });
};

export const useDebugConsoleCommand = function useDebugConsoleCommand(opts?: {
  when?: CommandWhen;
}) {
  const renderer = useRenderer();

  useCommand({
    handler: () => {
      renderer.console.toggle();
    },
    hotkey: "ctrl+shift+j",
    id: "toggle-debug-console",
    title: "Toggle debug console",
    when: opts?.when,
  });
};

export const useToggleLineNumbersCommand = function useToggleLineNumbersCommand(opts: {
  showLineNumbers: boolean;
  onToggle: () => void;
  when?: CommandWhen;
}) {
  useCommand({
    handler: (ctx) => {
      opts.onToggle();
      const next = !opts.showLineNumbers;
      ctx.toast.toast({
        id: "line-numbers-toggled",
        level: "info",
        message: `Line numbers: ${next ? "on" : "off"}`,
      });
    },
    hotkey: "shift+l",
    id: "toggle-line-numbers",
    title: "Toggle line numbers",
    when: opts.when,
  });
};
