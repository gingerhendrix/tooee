#!/usr/bin/env bun
import { launch as launchView, createFileProvider, createStdinProvider } from "@tooee/view"
import { launch as launchAsk } from "@tooee/ask"
import { launch as launchChoose, createStdinChooseProvider } from "@tooee/choose"
import { launch as launchTable, createFileProvider as createTableFileProvider, createStdinProvider as createTableStdinProvider } from "@tooee/table"

const [command, ...args] = process.argv.slice(2)

function printUsage(): void {
  console.log("Usage: tooee <command> [options]")
  console.log("")
  console.log("Commands:")
  console.log("  view [file]    Display markdown, code, or text")
  console.log("  ask [prompt]   Gather user input")
  console.log("  choose         Select items from a filterable list (stdin)")
  console.log("  table [file]   Display tabular data (CSV, TSV, JSON)")
  console.log("  request        Input → streaming response (library only)")
  console.log("")
  console.log("Examples:")
  console.log("  tooee view README.md")
  console.log("  cat file.md | tooee view")
  console.log('  tooee ask "Search for:"')
  console.log('  echo -e "foo\\nbar\\nbaz" | tooee choose')
  console.log('  echo -e "foo\\nbar\\nbaz" | tooee choose --multi')
  console.log("  tooee table data.csv")
  console.log("  cat data.csv | tooee table")
}

switch (command) {
  case "view": {
    const filePath = args[0]
    const contentProvider = filePath
      ? createFileProvider(filePath)
      : createStdinProvider()
    launchView({ contentProvider })
    break
  }

  case "ask": {
    const prompt = args.join(" ") || undefined
    launchAsk({ prompt })
    break
  }

  case "choose": {
    const multi = args.includes("--multi") || args.includes("-m")
    const promptIdx = args.indexOf("--prompt")
    const prompt = promptIdx !== -1 ? args[promptIdx + 1] : undefined
    const contentProvider = createStdinChooseProvider()
    const result = await launchChoose({ contentProvider, options: { multi, prompt } })
    if (result) {
      for (const item of result.items) {
        process.stdout.write((item.value ?? item.text) + "\n")
      }
    } else {
      process.exit(1)
    }
    break
  }

  case "table": {
    const filePath = args[0]
    const contentProvider = filePath
      ? createTableFileProvider(filePath)
      : createTableStdinProvider()
    launchTable({ contentProvider })
    break
  }

  case "request": {
    console.error("tooee request requires a content provider. Use as a library: import { launch } from '@tooee/request'")
    process.exit(1)
    break
  }

  case "help":
  case "--help":
  case "-h":
  case undefined:
    printUsage()
    break

  default:
    console.error(`Unknown command: ${command}`)
    printUsage()
    process.exit(1)
}
