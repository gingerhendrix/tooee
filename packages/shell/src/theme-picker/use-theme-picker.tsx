import { useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useOverlay, useOverlayState } from "@tooee/overlays";
import type { OverlayHandle } from "@tooee/overlays";
import { useThemeSwitcher } from "@tooee/themes";
import { ThemePickerOverlay } from "./theme-picker-overlay.js";
import type { ThemePickerEntry } from "./theme-picker.js";

export interface ThemePickerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  confirm: (name: string) => void;
  preview: (name: string) => void;
  entries: ThemePickerEntry[];
  originalTheme: string;
  currentTheme: string;
}

const OVERLAY_ID = "theme-picker";

export const useThemePicker = function useThemePicker(): ThemePickerState {
  const { allThemes, setTheme, name: currentTheme } = useThemeSwitcher();
  const overlay = useOverlay();
  const { stack } = useOverlayState();
  const originalThemeRef = useRef(currentTheme);
  const handleRef = useRef<OverlayHandle<null> | null>(null);
  const entries = useMemo<ThemePickerEntry[]>(
    () => allThemes.map((name) => ({ id: name, title: name })),
    [allThemes],
  );

  const close = useCallback(() => {
    setTheme(originalThemeRef.current);
    handleRef.current?.close();
    handleRef.current = null;
  }, [setTheme]);

  const confirm = useCallback(
    (name: string) => {
      setTheme(name, { persist: true });
      handleRef.current?.close();
      handleRef.current = null;
    },
    [setTheme],
  );

  const preview = useCallback(
    (name: string) => {
      setTheme(name);
    },
    [setTheme],
  );

  const open = useCallback(() => {
    originalThemeRef.current = currentTheme;
    handleRef.current = overlay.open(
      OVERLAY_ID,
      ({ close: closeOverlay }): ReactNode => (
        <ThemePickerOverlay
          currentTheme={currentTheme}
          entries={entries}
          onClose={() => {
            setTheme(originalThemeRef.current);
            closeOverlay();
            handleRef.current = null;
          }}
          onPreview={setTheme}
          onSelect={(name) => {
            setTheme(name, { persist: true });
            closeOverlay();
            handleRef.current = null;
          }}
        />
      ),
      null,
      {
        onClose: () => {
          handleRef.current = null;
        },
        ownCommands: true,
        role: "modal",
        surfaceMode: "insert",
      },
    );
  }, [currentTheme, entries, overlay, setTheme]);

  return {
    close,
    confirm,
    currentTheme,
    entries,
    isOpen: stack.includes(OVERLAY_ID),
    open,
    originalTheme: originalThemeRef.current,
    preview,
  };
};
