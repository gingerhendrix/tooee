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

const parseRenderer = function parseRenderer(value: string | undefined): ContentFormat | undefined {
  if (value === undefined || value === "") {
    console.error("Missing value for --renderer");
    process.exit(1);
  }
  const renderer = RENDERERS.find((candidate) => candidate === value);
  if (renderer === undefined) {
    console.error(`Unknown renderer: ${value}`);
    console.error(`Expected one of: ${RENDERERS.join(", ")}`);
    process.exit(1);
  }
  return renderer;
};

const parseViewArgs = function parseViewArgs(rawArgs: string[]): ViewArgs {
  let renderer: ContentFormat | undefined;
  let filePath: string | undefined;

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--renderer" || arg === "-r") {
      i += 1;
      renderer = parseRenderer(rawArgs[i]);
      continue;
    }
    if (arg.startsWith("--renderer=")) {
      renderer = parseRenderer(arg.slice("--renderer=".length));
      continue;
    }
    if (filePath === undefined || filePath === "") {
      filePath = arg;
      continue;
    }

    console.error(`Unexpected argument: ${arg}`);
    process.exit(1);
  }

  return { filePath, renderer };
};

const printUsage = function printUsage(): void {
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
};

switch (command) {
  case "view": {
    const { filePath, renderer } = parseViewArgs(args);
    if (filePath !== undefined && filePath !== "") {
      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          if (renderer) {
            console.error("--renderer cannot be used with directory view");
            process.exit(1);
          }
          await launchDirectory({ dirPath: filePath });
          break;
        }
      } catch {
        // Fall through to file provider which will show its own error
      }
    }
    const contentProvider =
      filePath !== undefined && filePath !== ""
        ? createFileProvider(filePath, { renderer })
        : createStdinProvider({ renderer });
    await launchView({ contentProvider });
    break;
  }

  case "ask": {
    const singleLine = args.includes("--single-line") || args.includes("-s");
    const filtered = args.filter(
      (a) => a !== "--multiline" && a !== "-m" && a !== "--single-line" && a !== "-s",
    );
    const prompt = filtered.join(" ") || undefined;
    await launchAsk({ multiline: !singleLine, prompt });
    break;
  }

  case "choose": {
    const multi = args.includes("--multi") || args.includes("-m");
    const promptIdx = args.indexOf("--prompt");
    const prompt = promptIdx === -1 ? undefined : args[promptIdx + 1];
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
    const contentProvider =
      filePath !== undefined && filePath !== ""
        ? createFileProvider(filePath, { renderer: "table" })
        : createStdinProvider({ renderer: "table" });
    await launchView({ contentProvider });
    break;
  }

  case "help":
  case "--help":
  case "-h":
  case undefined: {
    printUsage();
    break;
  }

  default: {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }
}
