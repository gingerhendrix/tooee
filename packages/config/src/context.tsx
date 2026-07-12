import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { TooeeConfig } from "./types.js";
import { loadConfig } from "./load.js";

const DEFAULTS: TooeeConfig = {
  theme: {
    mode: "dark",
    name: "tokyonight",
  },
};

const ConfigContext = createContext<TooeeConfig>(DEFAULTS);

export const ConfigProvider = function ConfigProvider({
  overrides,
  children,
}: {
  overrides?: Partial<TooeeConfig>;
  children: ReactNode;
}): ReactNode {
  const config = useMemo(() => loadConfig(overrides), [overrides]);
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export const useConfig = function useConfig(): TooeeConfig {
  return useContext(ConfigContext);
};

export const useThemeConfig = function useThemeConfig(): TooeeConfig["theme"] {
  return useConfig().theme;
};

export const useKeymapConfig = function useKeymapConfig(): Record<string, string> {
  return useConfig().keys ?? {};
};
