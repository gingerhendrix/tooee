import { launch as launchView, createFileProvider, createStdinProvider } from "@tooee/view"
import { launch as launchAsk } from "@tooee/ask"
import { launch as launchRequest } from "@tooee/request"

const [command, ...args] = process.argv.slice(2)

function printUsage(): void {
  console.log("Usage: tooee <command> [options]")
  console.log("")
  console.log("Commands:")
  console.log("  view [file]    Display markdown, code, or text")
  console.log("  ask [prompt]   Gather user input")
  console.log("  request [input]  Input → streaming response")
  console.log("")
  console.log("Examples:")
  console.log("  tooee view README.md")
  console.log("  cat file.md | tooee view")
  console.log('  tooee ask "Search for:"')
  console.log('  tooee request "Explain React"')
}

switch (command) {
  case "view": {
    const filePath = args[0]
    const isTTY = Bun.stdin.stream() !== undefined && !filePath
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

  case "request": {
    const initialInput = args.join(" ") || undefined
    if (!initialInput) {
      console.error("Error: request command requires a content provider.")
      console.error("Use tooee request as a library with a custom content provider.")
      process.exit(1)
    }
    // No default provider — must be used as a library with a custom content provider
    // For CLI usage, show an error
    console.error("Error: request command requires a content provider backend.")
    console.error("Use @tooee/request as a library with a custom RequestContentProvider.")
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
