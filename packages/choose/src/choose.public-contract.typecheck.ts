/** Compile-time checks for the Choose component's 0.9 public props. */
import type { ChooseProps } from "./choose.js";

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type Has<TKeys, TName> = [Extract<TKeys, TName>] extends [never] ? false : true;

type Props = keyof ChooseProps;
type RetainedProps = Assert<Has<Props, "actions" | "multi" | "prompt" | "title">>;
type RemovedProps = Assert<IsNever<Extract<Props, "commands" | "options">>>;

export type ChoosePublicContractChecks = [RetainedProps, RemovedProps];
