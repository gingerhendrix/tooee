import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Hunk = { newCount: number; newStart: number; oldCount: number; oldStart: number };
type Diagnostic = {
  code: string;
  filename: string;
  labels: Array<{
    span: { column?: number; length?: number; line: number; offset?: number };
  }>;
  message: string;
};
type FileChange = { headPath: string | null; indexPath: string | null; hunks: Hunk[] };

const QUALITY_FILE = /\.(?:css|js|json|jsonc|jsx|md|ts|tsx|yaml|yml)$/u;
const LINT_FILE = /\.(?:js|jsx|ts|tsx)$/u;

const run = (command: string[], cwd = process.cwd()) => {
  const result = Bun.spawnSync(command, { cwd, stderr: "pipe", stdout: "pipe" });
  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString(),
  };
};

export const parseHunks = (diff: string): Hunk[] =>
  [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gmu)].map((match) => ({
    newCount: Number(match[4] ?? 1),
    newStart: Number(match[3]),
    oldCount: Number(match[2] ?? 1),
    oldStart: Number(match[1]),
  }));

export const mapInheritedLine = (line: number, hunks: Hunk[]): number | null => {
  let delta = 0;
  for (const hunk of hunks) {
    if (line < hunk.oldStart) {
      break;
    }
    if (hunk.oldCount === 0 && line === hunk.oldStart) {
      break;
    }
    if (hunk.oldCount > 0 && line < hunk.oldStart + hunk.oldCount) {
      if (hunk.newCount === 0) return null;
      const offset = line - hunk.oldStart;
      const proportionalOffset = Math.floor(((offset + 0.5) * hunk.newCount) / hunk.oldCount);
      return hunk.newStart + Math.min(proportionalOffset, hunk.newCount - 1);
    }
    delta += hunk.newCount - hunk.oldCount;
  }
  return line + delta;
};

const lineAt = (root: string, path: string, line: number) =>
  readFileSync(join(root, path), "utf8").split("\n")[line - 1]?.trim() ?? "";
const normalizedLine = (line: string) =>
  line.replaceAll(/[;,]/gu, "").replaceAll(/\s+/gu, " ").trim();
const mapContentLine = (
  headRoot: string,
  indexRoot: string,
  headPath: string,
  indexPath: string,
  oldLine: number,
) => {
  const headLines = readFileSync(join(headRoot, headPath), "utf8").split("\n").map(normalizedLine);
  const indexLines = readFileSync(join(indexRoot, indexPath), "utf8")
    .split("\n")
    .map(normalizedLine);
  const content = headLines[oldLine - 1];
  if (!content) return null;
  if (indexLines[oldLine - 1] === content) return oldLine;
  const occurrence = headLines.slice(0, oldLine).filter((line) => line === content).length;
  const candidates = indexLines.flatMap((line, index) => (line === content ? [index + 1] : []));
  return candidates[occurrence - 1] ?? null;
};
const spanKey = (diagnostic: Diagnostic) => {
  const span = diagnostic.labels[0]?.span;
  return `${span?.column ?? ""}\0${span?.length ?? ""}`;
};
const diagnosticKey = (diagnostic: Diagnostic, path: string, line: number) =>
  `${path}\0${diagnostic.code}\0${diagnostic.message}\0${line}\0${spanKey(diagnostic)}`;

const lineIsChanged = (line: number, hunks: Hunk[]) =>
  hunks.some(
    (hunk) => hunk.oldCount > 0 && line >= hunk.oldStart && line < hunk.oldStart + hunk.oldCount,
  );

export const findNewDiagnostics = (
  headDiagnostics: Diagnostic[],
  indexDiagnostics: Diagnostic[],
  changes: FileChange[],
  headRoot: string,
  indexRoot: string,
) => {
  const exact = new Map<string, number>();
  const increment = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);
  const consume = (map: Map<string, number>, key: string) => {
    const count = map.get(key) ?? 0;
    if (count === 0) return false;
    map.set(key, count - 1);
    return true;
  };

  for (const diagnostic of headDiagnostics) {
    const change = changes.find(({ headPath }) => headPath === diagnostic.filename);
    if (!change?.indexPath) continue;
    const oldLine = diagnostic.labels[0]?.span.line ?? 1;
    const contentLine = mapContentLine(
      headRoot,
      indexRoot,
      diagnostic.filename,
      change.indexPath,
      oldLine,
    );
    const mappedLine =
      contentLine ??
      (lineIsChanged(oldLine, change.hunks) ? null : mapInheritedLine(oldLine, change.hunks));
    if (mappedLine !== null) {
      increment(exact, diagnosticKey(diagnostic, change.indexPath, mappedLine));
    }
  }

  return indexDiagnostics.filter((diagnostic) => {
    const line = diagnostic.labels[0]?.span.line ?? 1;
    if (consume(exact, diagnosticKey(diagnostic, diagnostic.filename, line))) {
      return false;
    }
    return true;
  });
};

export const findNewDiagnosticCounts = (
  headDiagnostics: Diagnostic[],
  indexDiagnostics: Diagnostic[],
) => {
  const inherited = new Map<string, number>();
  const key = (diagnostic: Diagnostic) =>
    `${diagnostic.filename}\0${diagnostic.code}\0${diagnostic.message}`;
  for (const diagnostic of headDiagnostics) {
    const diagnosticKey = key(diagnostic);
    inherited.set(diagnosticKey, (inherited.get(diagnosticKey) ?? 0) + 1);
  }
  return indexDiagnostics.filter((diagnostic) => {
    const diagnosticKey = key(diagnostic);
    const count = inherited.get(diagnosticKey) ?? 0;
    if (count === 0) return true;
    inherited.set(diagnosticKey, count - 1);
    return false;
  });
};

const parseChanges = (): FileChange[] => {
  const result = run(["git", "diff", "--cached", "--name-status", "-z", "--find-renames"]);
  if (result.exitCode !== 0) throw new Error(result.stderr);
  const fields = result.stdout.split("\0").filter(Boolean);
  const changes: FileChange[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const status = fields[index];
    if (!status) continue;
    const kind = status[0];
    const headPath = kind === "A" ? null : (fields[index + 1] ?? null);
    const indexPath = kind === "D" ? null : (fields[index + (kind === "R" ? 2 : 1)] ?? null);
    index += kind === "R" ? 2 : 1;
    const relevantPath = indexPath ?? headPath;
    if (!relevantPath || !QUALITY_FILE.test(relevantPath)) continue;
    const diff = run(["git", "diff", "--cached", "--unified=0", "--", relevantPath]);
    if (diff.exitCode !== 0) throw new Error(diff.stderr);
    changes.push({ headPath, hunks: parseHunks(diff.stdout), indexPath });
  }
  return changes;
};

const materialize = (root: string) => {
  const head = join(root, "head");
  const index = join(root, "index");
  mkdirSync(head);
  mkdirSync(index);
  const archive = run(["sh", "-c", 'git archive HEAD | tar -x -C "$1"', "sh", head]);
  if (archive.exitCode !== 0) throw new Error(archive.stderr);
  const checkout = run(["git", "checkout-index", "--all", `--prefix=${index}/`]);
  if (checkout.exitCode !== 0) throw new Error(checkout.stderr);
  symlinkSync(resolve("node_modules"), join(head, "node_modules"), "dir");
  symlinkSync(resolve("node_modules"), join(index, "node_modules"), "dir");
  return { head, index };
};

const isPinnedFormatterOutput = (root: string, indexRoot: string, changes: FileChange[]) => {
  if (changes.some((change) => !change.headPath || !change.indexPath)) return false;
  const expected = join(root, "formatted-head");
  mkdirSync(expected);
  const archive = run(["sh", "-c", 'git archive HEAD | tar -x -C "$1"', "sh", expected]);
  if (archive.exitCode !== 0) throw new Error(archive.stderr);
  symlinkSync(resolve("node_modules"), join(expected, "node_modules"), "dir");
  const paths = changes.map((change) => change.headPath!);
  const formatted = run([resolve("node_modules/.bin/oxfmt"), "--write", ...paths], expected);
  if (formatted.exitCode !== 0) throw new Error(formatted.stderr || formatted.stdout);
  return changes.every((change) =>
    readFileSync(join(expected, change.headPath!)).equals(
      readFileSync(join(indexRoot, change.indexPath!)),
    ),
  );
};

const lint = (root: string, paths: string[]): Diagnostic[] => {
  if (paths.length === 0) return [];
  const pathSet = new Set(paths);
  const scanPaths = existsSync(join(root, "oxlint.config.ts")) ? ["."] : paths;
  const result = run(
    [
      resolve("node_modules/.bin/oxlint"),
      "--format",
      "json",
      "--no-error-on-unmatched-pattern",
      ...scanPaths,
    ],
    root,
  );
  const parsed = JSON.parse(result.stdout || '{"diagnostics":[]}') as { diagnostics: Diagnostic[] };
  return parsed.diagnostics.filter((diagnostic) => pathSet.has(diagnostic.filename));
};

const formatDiagnostics = (root: string, paths: string[], backupRoot: string): Diagnostic[] => {
  for (const path of paths) {
    const backup = join(backupRoot, path);
    mkdirSync(dirname(backup), { recursive: true });
    Bun.write(backup, readFileSync(join(root, path)));
  }
  if (paths.length > 0) {
    const formatted = run([resolve("node_modules/.bin/oxfmt"), "--write", ...paths], root);
    if (formatted.exitCode !== 0) throw new Error(formatted.stderr || formatted.stdout);
  }
  return paths.flatMap((path) => {
    const diff = run([
      "git",
      "diff",
      "--no-index",
      "--unified=0",
      "--",
      join(backupRoot, path),
      join(root, path),
    ]);
    return parseHunks(diff.stdout).map((hunk) => ({
      code: "oxfmt(format)",
      filename: path,
      labels: [{ span: { line: hunk.oldStart } }],
      message: "File is not formatted at this location.",
    }));
  });
};

const formattingRegressions = (
  headRoot: string,
  indexRoot: string,
  changes: FileChange[],
  backupRoot: string,
) => {
  const headPaths = changes.flatMap(({ headPath }) => (headPath ? [headPath] : []));
  const indexPaths = changes.flatMap(({ indexPath }) => (indexPath ? [indexPath] : []));
  const headDiagnostics = formatDiagnostics(headRoot, headPaths, join(backupRoot, "head"));
  const indexDiagnostics = formatDiagnostics(indexRoot, indexPaths, join(backupRoot, "index"));
  const newDiagnostics = findNewDiagnostics(
    headDiagnostics,
    indexDiagnostics,
    changes,
    join(backupRoot, "head"),
    join(backupRoot, "index"),
  );
  if (newDiagnostics.length === 0 && indexDiagnostics.length > headDiagnostics.length) {
    return indexDiagnostics.slice(headDiagnostics.length);
  }
  return newDiagnostics;
};

const main = () => {
  const changes = parseChanges();
  if (changes.length === 0) {
    console.log("No staged quality files.");
    return;
  }
  const temporaryRoot = mkdtempSync(join(tmpdir(), "tooee-staged-quality-"));
  try {
    const { head, index } = materialize(temporaryRoot);
    const headPaths = changes.flatMap(({ headPath }) =>
      headPath && LINT_FILE.test(headPath) ? [headPath] : [],
    );
    const indexPaths = changes.flatMap(({ indexPath }) =>
      indexPath && LINT_FILE.test(indexPath) ? [indexPath] : [],
    );
    const headDiagnostics = lint(head, headPaths);
    const indexDiagnostics = lint(index, indexPaths);
    const pinnedFormatterOutput = isPinnedFormatterOutput(temporaryRoot, index, changes);
    const newDiagnostics = pinnedFormatterOutput
      ? findNewDiagnosticCounts(headDiagnostics, indexDiagnostics)
      : findNewDiagnostics(headDiagnostics, indexDiagnostics, changes, head, index);
    const formatting = pinnedFormatterOutput
      ? []
      : formattingRegressions(head, index, changes, join(temporaryRoot, "before-format"));
    if (newDiagnostics.length > 0 || formatting.length > 0) {
      for (const diagnostic of newDiagnostics) {
        console.error(
          `${diagnostic.filename}:${diagnostic.labels[0]?.span.line ?? 1}: new ${diagnostic.code}: ${diagnostic.message}`,
        );
      }
      for (const diagnostic of formatting) {
        console.error(
          `${diagnostic.filename}:${diagnostic.labels[0]?.span.line ?? 1}: new formatting debt`,
        );
      }
      process.exitCode = 1;
      return;
    }
    console.log(
      `Staged quality passed for ${changes.length} file(s); no new diagnostics or formatting debt.`,
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

if (import.meta.main) main();
