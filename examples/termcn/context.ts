/** App-wide services shared by the list, detail, and preview components. */

import { createContext, useContext } from "react";

import type { TermcnClient } from "./data/client.js";
import type { VendorStatus } from "./preview/vendor.js";
import type { Resource } from "./use-resource.js";

export interface TermcnServices {
  client: TermcnClient;
  vendorDirectory: string;
  vendor: Resource<VendorStatus>;
  /** Every component name in the registry, for demo ownership by file name. */
  componentNames: readonly string[];
}

export const TermcnContext = createContext<TermcnServices | null>(null);

export const useTermcn = function useTermcn(): TermcnServices {
  const services = useContext(TermcnContext);

  if (services === null) {
    throw new Error("useTermcn must be used inside TermcnContext");
  }

  return services;
};
