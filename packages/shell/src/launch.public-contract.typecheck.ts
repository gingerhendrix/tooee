/** Compile-time checks for launchCli's 0.9 option nesting. */
import type { LaunchCliOptions, TooeeProviderOptions } from "./launch.js";

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type Has<TKeys, TName> = [Extract<TKeys, TName>] extends [never] ? false : true;

type LaunchKeys = keyof LaunchCliOptions;
type ProviderKeys = keyof TooeeProviderOptions;
type RetainedLaunchOptions = Assert<Has<LaunchKeys, "provider" | "renderer" | "stdinPolicy">>;
type RemovedLaunchAliases = Assert<
  IsNever<Extract<LaunchKeys, "config" | "initialMode" | "leader" | "sequenceTimeoutMs">>
>;
type NestedProviderOptions = Assert<
  Has<ProviderKeys, "config" | "initialMode" | "leader" | "sequenceTimeoutMs">
>;

export type LaunchPublicContractChecks = [
  RetainedLaunchOptions,
  RemovedLaunchAliases,
  NestedProviderOptions,
];
