import { afterEach, expect, test } from "bun:test";
import path from "node:path";
import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const CLI = path.resolve(REPO_ROOT, "apps/cli/src/main.ts");
const cliCommand = `bun --conditions=@tooee/source ${JSON.stringify(CLI)}`;

let session: Session | undefined;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The application can close the PTY before test cleanup.
  }
  session = undefined;
});

const launchShell = async function launchShell(source: string): Promise<Session> {
  const terminal = await launchTerminal({
    args: ["-lc", source],
    cols: 80,
    command: "bash",
    cwd: REPO_ROOT,
    env: process.env,
    rows: 24,
  });
  session = terminal;
  return terminal;
};

test("Ask renders on the terminal while command substitution captures only its answer", async () => {
  const terminal = await launchShell(
    `answer=$(${cliCommand} ask --single-line "Name:"); status=$?; printf '\\nCAPTURE<%s> STATUS<%s>\\n' "$answer" "$status"`,
  );

  await terminal.waitForText("Name:", { timeout: 15_000 });
  await terminal.type("feature-branch");
  await terminal.press("enter");
  await terminal.waitForText("CAPTURE<feature-branch> STATUS<0>", { timeout: 5000 });
}, 20_000);

test("Ask cancellation writes no value and exits with status 1", async () => {
  const terminal = await launchShell(
    `answer=$(${cliCommand} ask --single-line "Name:"); status=$?; printf '\\nCAPTURE<%s> STATUS<%s>\\n' "$answer" "$status"`,
  );

  await terminal.waitForText("Name:", { timeout: 15_000 });
  await terminal.press("escape");
  await terminal.press("q");
  await terminal.waitForText("CAPTURE<> STATUS<1>", { timeout: 5000 });
}, 20_000);

test("Choose keeps piped items and captured output separate from its terminal UI", async () => {
  const terminal = await launchShell(
    `choice=$(printf 'alpha\\nbeta\\n' | ${cliCommand} choose); status=$?; printf '\\nCAPTURE<%s> STATUS<%s>\\n' "$choice" "$status"`,
  );

  await terminal.waitForText("alpha", { timeout: 15_000 });
  await terminal.press("enter");
  await terminal.waitForText("CAPTURE<alpha> STATUS<0>", { timeout: 5000 });
}, 20_000);

test("Choose writes only the selected line when stdout is a file", async () => {
  const terminal = await launchShell(
    `file=$(mktemp); printf 'alpha\\nbeta\\n' | ${cliCommand} choose >"$file"; status=$?; value=$(cat "$file"); bytes=$(wc -c <"$file"); rm -f "$file"; printf '\\nFILE<%s> BYTES<%s> STATUS<%s>\\n' "$value" "$bytes" "$status"`,
  );

  await terminal.waitForText("alpha", { timeout: 15_000 });
  await terminal.press("enter");
  await terminal.waitForText(/FILE<alpha> BYTES<\s*6> STATUS<0>/u, { timeout: 5000 });
}, 20_000);

test("View remains interactive after its piped content closes", async () => {
  const terminal = await launchShell(
    `printf '# piped title\\n' | ${cliCommand} view; printf '\\nVIEW_STATUS<%s>\\n' "$?"`,
  );

  await terminal.waitForText("piped title", { timeout: 15_000 });
  await terminal.press("q");
  await terminal.waitForText("VIEW_STATUS<0>", { timeout: 5000 });
}, 20_000);

test("a session without a controlling terminal reports a startup error", async () => {
  const process = Bun.spawn(["setsid", "bun", "--conditions=@tooee/source", CLI, "choose"], {
    cwd: REPO_ROOT,
    stderr: "pipe",
    stdin: "pipe",
    stdout: "pipe",
  });
  void process.stdin.end();

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  expect(exitCode).toBe(2);
  expect(stdout).toBe("");
  expect(stderr).toContain("Unable to start Tooee:");
  expect(stderr).toContain("/dev/tty");
}, 10_000);
