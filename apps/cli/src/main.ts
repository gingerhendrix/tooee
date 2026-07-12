#!/usr/bin/env bun
import {
  launch as launchView,
  launchDirectory,
  createFileProvider,
  createStdinProvider,
} from "@tooee/view";
import type { ContentFormat } from "@tooee/view";
import { statSync } from "node:fs";
import { launch as launchAsk } from "@tooee/ask";
import { launch as launchChoose, createStdinChooseProvider } from "@tooee/choose";

const [command, ...args] = process.argv.slice(2);

const RENDERERS: ContentFormat[] = ["markdown", "code", "text", "table"];

interface ViewArgs {
  filePath?: string;
  renderer?: ContentFormat;
}

function parseRenderer(value: string | undefined): ContentFormat | undefined {
  if (!value) {
    console.error("Missing value for --renderer");
    process.exit(1);
  }
  if (!RENDERERS.includes(value as ContentFormat)) {
    console.error(`Unknown renderer: ${value}`);
    console.error(`Expected one of: ${RENDERERS.join(", ")}`);
    process.exit(1);
  }
  return value as ContentFormat;
}

function parseViewArgs(rawArgs: string[]): ViewArgs {
  let renderer: ContentFormat | undefined;
  let filePath: string | undefined;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--renderer" || arg === "-r") {
      renderer = parseRenderer(rawArgs[++i]);
      continue;
    }
    if (arg.startsWith("--renderer=")) {
      renderer = parseRenderer(arg.slice("--renderer=".length));
      continue;
    }
    if (!filePath) {
      filePath = arg;
      continue;
    }

    console.error(`Unexpected argument: ${arg}`);
    process.exit(1);
  }

  return { filePath, renderer };
}

function printUsage(): void {
  console.log("Usage: tooee <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  view [file]    Display markdown, code, text, or tables");
  console.log("  ask [prompt]   Gather multiline user input");
  console.log("  choose         Select items from a filterable list (stdin)");
  console.log("  table [file]   Display tabular data (deprecated; use view --renderer table)");

  console.log("");
  console.log("View options:");
  console.log("  --renderer, -r <renderer>  Force renderer: markdown, code, text, table");

  console.log("");
  console.log("Examples:");
  console.log("  tooee view README.md");
  console.log("  tooee view --renderer text README.md");
  console.log("  tooee view --renderer table data.csv");
  console.log("  cat file.md | tooee view");
  console.log("  cat data.csv | tooee view --renderer table");
  console.log('  tooee ask "Search for:"');
  console.log('  tooee ask --single-line "Search for:"');
  console.log('  echo -e "foo\\nbar\\nbaz" | tooee choose');
  console.log('  echo -e "foo\\nbar\\nbaz" | tooee choose --multi');
  console.log("  tooee table data.csv");
}

switch (command) {
  case "view": {
    const { filePath, renderer } = parseViewArgs(args);
    if (filePath) {
      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          if (renderer) {
            console.error("--renderer cannot be used with directory view");
            process.exit(1);
          }
          launchDirectory({ dirPath: filePath });
          break;
        }
      } catch {
        // Fall through to file provider which will show its own error
      }
    }
    const contentProvider = filePath
      ? createFileProvider(filePath, { renderer })
      : createStdinProvider({ renderer });
    launchView({ contentProvider });
    break;
  }

  case "ask": {
    const singleLine = args.includes("--single-line") || args.includes("-s");
    const filtered = args.filter(
      (a) => a !== "--multiline" && a !== "-m" && a !== "--single-line" && a !== "-s",
    );
    const prompt = filtered.join(" ") || undefined;
    launchAsk({ prompt, multiline: !singleLine });
    break;
  }

  case "choose": {
    const multi = args.includes("--multi") || args.includes("-m");
    const promptIdx = args.indexOf("--prompt");
    const prompt = promptIdx !== -1 ? args[promptIdx + 1] : undefined;
    const contentProvider = createStdinChooseProvider();
    const result = await launchChoose({ contentProvider, options: { multi, prompt } });
    if (result) {
      for (const item of result.items) {
        process.stdout.write(`${item.value ?? item.text}\n`);
      }
    } else {
      process.exit(1);
    }
    break;
  }

  case "table": {
    const { filePath } = parseViewArgs(args);
    const contentProvider = filePath
      ? createFileProvider(filePath, { renderer: "table" })
      : createStdinProvider({ renderer: "table" });
    launchView({ contentProvider });
    break;
  }

  case "help":
  case "--help":
  case "-h":
  case undefined:
    printUsage();
    break;

  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
