/** Compile-time checks for AppLayout's 0.9 scroll configuration. */
import type { AppLayoutProps, AppLayoutScroll } from "./app-layout.js";

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type Has<TKeys, TName> = [Extract<TKeys, TName>] extends [never] ? false : true;

type LayoutKeys = keyof AppLayoutProps;
type ScrollKeys = keyof AppLayoutScroll;
type RetainedScrollProp = Assert<Has<LayoutKeys, "scroll">>;
type RemovedScrollAliases = Assert<IsNever<Extract<LayoutKeys, "scrollProps" | "scrollRef">>>;
type NestedScrollOptions = Assert<
  Has<ScrollKeys, "focused" | "ref" | "stickyScroll" | "stickyStart">
>;

export type AppLayoutPublicContractChecks = [
  RetainedScrollProp,
  RemovedScrollAliases,
  NestedScrollOptions,
];
