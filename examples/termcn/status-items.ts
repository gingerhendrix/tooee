/** Status bar content: catalogue size, demo source, and key hints. */

import type { StatusBarItem } from "@tooee/layout";

import type { Loaded } from "./data/client.js";
import type { ComponentEntry } from "./data/registry.js";
import type { VendorStatus } from "./preview/vendor.js";
import type { Resource } from "./use-resource.js";

const registryLabel = function registryLabel(registry: Resource<Loaded<ComponentEntry[]>>): string {
  if (registry.status === "ready") {
    return `${registry.value.value.length}${registry.value.stale ? " (offline)" : ""}`;
  }

  return registry.status === "error" ? "unavailable" : "loading";
};

const vendorLabel = function vendorLabel(vendor: Resource<VendorStatus>): string {
  if (vendor.status !== "ready") {
    return "checking";
  }

  return vendor.value.available ? `termcn ${vendor.value.commit.slice(0, 7)}` : "not synced";
};

export const statusItems = function statusItems(
  registry: Resource<Loaded<ComponentEntry[]>>,
  vendor: Resource<VendorStatus>
): StatusBarItem[] {
  return [
    { label: "components", value: registryLabel(registry) },
    { label: "demos", value: vendorLabel(vendor) },
    { label: "keys", value: "Tab panel · i filter · y copy · 1-3 tabs · : palette · q quit" },
  ];
};
