/** Compile-time checks that RouterProvider accepts a router made with `context`. */
import type { RouterProviderProps } from "./context.js";
import type { RouterInstance } from "./types.js";

type Assert<T extends true> = T;

type Accepts<TRouter> = TRouter extends RouterProviderProps["router"] ? true : false;

interface AppContext {
  user: string;
}

type PlainRouter = Assert<Accepts<RouterInstance>>;

type ContextRouter = Assert<Accepts<RouterInstance<AppContext>>>;

export type RouterProviderPublicContractChecks = [PlainRouter, ContextRouter];
