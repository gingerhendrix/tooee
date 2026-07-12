import { createElement } from "react";
import type { ReactNode } from "react";
import { useThemeSwitcher, ThemePicker } from "@tooee/themes";

export const ThemePickerOverlay = function ThemePickerOverlay({
  originalTheme,
  close,
}: {
  originalTheme: string;
  close: () => void;
}): ReactNode {
  const { allThemes, name: currentTheme, setTheme } = useThemeSwitcher();
  const entries = allThemes.map((name: string) => ({ id: name, title: name }));

  return createElement(ThemePicker, {
    currentTheme,
    entries,
    onClose: () => {
      setTheme(originalTheme);
      close();
    },
    onNavigate: setTheme,
    onSelect: (name: string) => {
      setTheme(name, { persist: true });
      close();
    },
  });
};
