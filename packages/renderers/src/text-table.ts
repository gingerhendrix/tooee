import { extend } from "@opentui/react"
import { TextTableRenderable } from "@opentui/core"

extend({ "text-table": TextTableRenderable })

declare module "@opentui/react" {
  interface OpenTUIComponents {
    "text-table": typeof TextTableRenderable
  }
}
