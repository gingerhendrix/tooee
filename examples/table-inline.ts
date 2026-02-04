#!/usr/bin/env bun
/**
 * table-inline.ts - Demonstrates @tooee/table with inline data
 *
 * This example shows:
 * - Creating a TableContentProvider with inline data
 * - TableContent structure with headers, rows, title, and format
 * - Navigation and scrolling through table data
 *
 * Run: bun examples/table-inline.ts
 * Controls: j/k scroll rows, h/l scroll columns, q quit, t/T cycle themes
 */

import { launch, type TableContentProvider, type TableContent } from "@tooee/table"

// Create a content provider with inline table data
const contentProvider: TableContentProvider = {
  load: (): TableContent => ({
    title: "Programming Languages",

    // Column headers
    headers: ["Language", "Year", "Creator", "Paradigm"],

    // Data rows (each row is an array of strings)
    rows: [
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
    ],

    // Format hint (csv, tsv, json, or unknown)
    // This affects how the data is interpreted when loading from files
    format: "unknown",
  }),
}

// Launch the table viewer
launch({ contentProvider })
