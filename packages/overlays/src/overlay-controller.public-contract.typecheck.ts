/** Compile-time checks for the handle-based 0.9 overlay controller. */
import type { OverlayController, OverlayHandle } from "./overlay-context.js";

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type Has<TKeys, TName> = [Extract<TKeys, TName>] extends [never] ? false : true;

type ControllerKeys = keyof OverlayController;
type HandleKeys = keyof OverlayHandle<unknown>;
type RetainedController = Assert<Has<ControllerKeys, "closeTop" | "open" | "update">>;
type RemovedControllerAliases = Assert<
  IsNever<Extract<ControllerKeys, "hide" | "isOpen" | "show">>
>;
type RetainedHandle = Assert<Has<HandleKeys, "close" | "update">>;

export type OverlayControllerPublicContractChecks = [
  RetainedController,
  RemovedControllerAliases,
  RetainedHandle,
];
