// @ts-expect-error Mode was removed from @tooee/config in 0.9; use ColorMode.
import type { ColorMode, Mode } from "./index.js";

export type ConfigPublicContractChecks = [ColorMode, Mode];
