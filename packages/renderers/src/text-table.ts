import { TextTableRenderable } from "@opentui/core";
import { extend } from "@opentui/react";

extend({ "text-table": TextTableRenderable });

declare module "@opentui/react" {
  interface OpenTUIComponents {
    "text-table": typeof TextTableRenderable;
  }
}
