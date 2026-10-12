/** Loading and error rows for a detail tab resource. */

import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import type { Resource } from "../use-resource.js";

export interface ResourceMessageProps {
  resource: Resource<unknown>;
  what: string;
}

export const ResourceMessage = function ResourceMessage({
  resource,
  what,
}: ResourceMessageProps): ReactNode {
  const { theme } = useTheme();

  if (resource.status === "error") {
    return (
      <box flexDirection="column" paddingLeft={1}>
        <text content={`Could not load ${what}.`} fg={theme.error} />
        <text content={resource.error} fg={theme.textMuted} />
      </box>
    );
  }

  return (
    <box paddingLeft={1}>
      <text content={`Loading ${what}...`} fg={theme.textMuted} />
    </box>
  );
};
