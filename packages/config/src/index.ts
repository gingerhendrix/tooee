export type { ColorMode, TooeeConfig } from "./types.js";
// oxlint-disable-next-line typescript/no-deprecated -- public compatibility alias
export type { Mode } from "./types.js";
export { loadConfig, writeGlobalConfig } from "./load.js";
export { ConfigProvider, useConfig, useThemeConfig, useKeymapConfig } from "./context.js";
