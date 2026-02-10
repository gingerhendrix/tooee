#!/usr/bin/env bun
/**
 * table-inline.ts - Demonstrates table viewing with inline data
 *
 * This example shows:
 * - Creating a ViewContentProvider with inline table data
 * - Serializing headers and rows as TSV for the view body
 * - Navigation and scrolling through table data
 *
 * Run: bun examples/table-inline.ts
 * Controls: j/k scroll rows, h/l scroll columns, q quit, t/T cycle themes
 */

import { launch, type ContentProvider, type Content } from "@tooee/view"

const headers = ["Language", "Year", "Creator", "Paradigm"]
const rows = [
  ["TypeScript", "2012", "Anders Hejlsberg", "Multi-paradigm"],
  ["Rust", "2010", "Graydon Hoare", "Multi-paradigm"],
  ["Go", "2009", "Robert Griesemer", "Concurrent"],
  ["Swift", "2014", "Chris Lattner", "Multi-paradigm"],
  ["Kotlin", "2011", "JetBrains", "Multi-paradigm"],
  ["Zig", "2016", "Andrew Kelley", "Imperative"],
  ["Python", "1991", "Guido van Rossum", "Multi-paradigm"],
  ["JavaScript", "1995", "Brendan Eich", "Multi-paradigm"],
  ["Ruby", "1995", "Yukihiro Matsumoto", "Object-oriented"],
  ["Elixir", "2011", "Jose Valim", "Functional"],
]

// Serialize as TSV for the view body
const body = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n")

const contentProvider: ContentProvider = {
  load: (): Content => ({
    title: "Programming Languages",
    body,
    format: "table",
  }),
}

launch({ contentProvider })
