// @ts-expect-error useCommandContext is not exported; use useSurfaceInvoke.
import { useCommandContext, useSurfaceInvoke } from "./index.js";

export const commandPublicContractTypeChecks = function commandPublicContractTypeChecks(): void {
  void useSurfaceInvoke;
  void useCommandContext;
};
