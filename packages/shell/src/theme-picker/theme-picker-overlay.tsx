import type { ReactNode } from "react";
import { ThemePicker } from "./theme-picker.js";
import type { ThemePickerEntry } from "./theme-picker.js";

export interface ThemePickerOverlayProps {
  currentTheme: string;
  entries: ThemePickerEntry[];
  onClose: () => void;
  onPreview: (name: string) => void;
  onSelect: (name: string) => void;
}

export const ThemePickerOverlay = function ThemePickerOverlay({
  currentTheme,
  entries,
  onClose,
  onPreview,
  onSelect,
}: ThemePickerOverlayProps): ReactNode {
  return (
    <ThemePicker
      currentTheme={currentTheme}
      entries={entries}
      onClose={onClose}
      onNavigate={onPreview}
      onSelect={onSelect}
    />
  );
};
