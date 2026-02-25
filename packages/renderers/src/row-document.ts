import { extend } from "@opentui/react"
import { RowDocumentRenderable } from "./RowDocumentRenderable.js"

extend({ "row-document": RowDocumentRenderable })

declare module "@opentui/react" {
  interface OpenTUIComponents {
    "row-document": typeof RowDocumentRenderable
  }
}
