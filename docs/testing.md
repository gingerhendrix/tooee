# Testing

Tooee has two layers of tests: component tests (headless, fast) and e2e tests (full process, slower).

## Running Tests

```bash
bun test                              # All tests
bun test packages/layout/test         # Layout component tests
bun test packages/renderers/test      # Renderer component tests
bun test packages/shell/test          # Shell tests only
bun test packages/view/test/e2e       # E2E tests only
```

## Component Tests (testRender)

Use OpenTUI's headless test renderer via `@opentui/react/test-utils`. These are fast, no process spawn required.

**Location**: `packages/layout/test/`, `packages/renderers/test/`, `packages/shell/test/`

### What's tested

| File                                     | Covers                                                  |
| ---------------------------------------- | ------------------------------------------------------- |
| `layout/test/TitleBar.test.tsx`          | Title and subtitle rendering                            |
| `layout/test/StatusBar.test.tsx`         | Label:value pairs                                       |
| `layout/test/AppLayout.test.tsx`         | Full layout chrome (title bar, status bar, scroll area) |
| `renderers/test/MarkdownView.test.tsx`   | Heading, list, code block rendering                     |
| `renderers/test/CodeView.test.tsx`       | Code content and line numbers                           |
| `renderers/test/Table.test.tsx`          | Table rendering                                         |
| `renderers/test/parsers.test.ts`         | Table parser logic                                      |
| `shell/test/modal.test.tsx`              | j/k scroll, gg/G jump, ctrl+d/u, mode transitions      |
| `shell/test/search.test.tsx`             | findMatchingLines, search activation/cancel/navigation  |
| `shell/test/cursor.test.tsx`             | Cursor/select mode transitions, movement, selection     |
| `shell/test/command-palette.test.tsx`    | Palette open/close, entry filtering                     |
| `shell/test/commands.test.tsx`           | Theme cycling (t/T), quit (q)                           |
| `choose/test/fuzzy.test.ts`             | Fuzzy filter scoring, matching, sorting                 |

### Pattern

```tsx
import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("renders content", async () => {
  testSetup = await testRender(<MyComponent />, { width: 80, height: 24 })
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("expected text")
})
```

### Key simulation

```typescript
testSetup.renderer.keyInput.emit("keypress", {
  name: "j",
  sequence: "j",
  ctrl: false,
  shift: false,
  meta: false,
  option: false,
  eventType: "press",
  repeated: false,
})
await testSetup.renderOnce()
```

Key input must be wrapped in React's `act()` to flush state updates through the command system.

### Snapshots

Several tests use `toMatchSnapshot()`. Update with:

```bash
bun test --update-snapshots
```

## E2E Tests (tuistory)

Use [tuistory](https://github.com/remorses/tuistory) ("Playwright for TUIs") to launch the real CLI binary in a terminal emulator and interact with it.

**Location**: `packages/view/test/e2e/`

### What's tested

| File                     | Covers                                                       |
| ------------------------ | ------------------------------------------------------------ |
| `e2e/render.test.ts`     | Markdown, code, and plain text rendering; status bar content |
| `e2e/navigation.test.ts` | j/k scroll, gg jump to top, G jump to bottom, ctrl+d/u       |
| `e2e/theme.test.ts`      | Theme cycling via t/T, status bar updates                    |
| `e2e/quit.test.ts`       | q exits the process cleanly                                  |
| `e2e/search.test.ts`     | Search bar open, query+submit, Escape cancel                 |
| `e2e/cursor.test.ts`     | Cursor/select mode via v, j/k movement, Escape chains        |

### Fixtures

Test fixtures live in `packages/view/test/fixtures/`:

- `sample.md` — markdown with headings, lists, code blocks
- `sample.ts` — typescript source file
- `plain.txt` — plain text
- `long.md` — 200+ lines for scroll testing

### Helper

`packages/view/test/e2e/helpers.ts` provides `launchView(fixture)` which:

1. Launches `bun apps/cli/src/main.ts view <fixture>`
2. Waits for the status bar (`Format:`) to confirm the app is ready
3. Returns a tuistory `Session`

### Pattern

```typescript
import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.ts"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

test("renders markdown heading", async () => {
  session = await launchView("sample.md")
  const text = await session.text()
  expect(text).toContain("Hello World")
}, 20000)
```

### tuistory API

```typescript
await session.press("j") // single key
await session.press(["ctrl", "d"]) // chord
await session.type("search query") // type string
await session.waitForText("pattern") // wait for text
await session.waitForText(/regex/) // regex match
const text = await session.text() // get terminal text
session.close() // cleanup
```

### Timeouts

E2E tests spawn real processes. Use generous timeouts (20s per test) to account for process startup.

## Adding Tests

### New component test

1. Create `packages/<pkg>/test/<Component>.test.tsx`
2. Use `testRender` to render the component with providers
3. Assert on `captureCharFrame()` content or use `toMatchSnapshot()`

### New e2e test

1. Add fixtures to `packages/view/test/fixtures/` if needed
2. Create test file in `packages/view/test/e2e/`
3. Use `launchView()` helper and tuistory assertions
4. Set 20s timeout on each test

## Escape Key Limitations

### Component tests: `kittyKeyboard: true`

Component tests using `testRender` emit synthetic key events directly, bypassing stdin parsing. The test renderer should be configured with kitty keyboard mode so that key events match the format the command system expects:

```typescript
testSetup = await testRender(<MyComponent />, {
  width: 80,
  height: 24,
  kittyKeyboard: true,
})
```

Escape key simulation works reliably in component tests:

```typescript
testSetup.renderer.keyInput.emit("keypress", {
  name: "escape",
  sequence: "\x1b",
  ctrl: false,
  shift: false,
  meta: false,
  option: false,
  eventType: "press",
  repeated: false,
})
```

### E2E tests: Escape is unreliable

tuistory sends raw `\x1b` for `session.press("escape")`, but OpenTUI enables the Kitty keyboard protocol by default and expects Escape encoded as `\x1b[27u`. The raw `\x1b` byte is ambiguous — it's also the first byte of every ANSI escape sequence — so OpenTUI either drops it or misparses it.

**Workaround**: Send the kitty-encoded Escape directly:

```typescript
// Instead of: await session.press("escape")
await session.writeRaw("\x1b[27u")
```

**Affected e2e scenarios** (skip or use workaround):

- Exiting search mode (Escape to dismiss search bar)
- Returning from select mode to cursor mode
- Any test that presses Escape

Until tuistory adds Kitty keyboard protocol support, use `session.writeRaw("\x1b[27u")` for Escape in e2e tests. See the full investigation at `phase-2-test-coverage/tuistory-escape-investigation.md`.

### Testing commands

For component-level command testing, create a harness component that wraps with providers (`TooeeProvider` or `CommandProvider`) and renders state as text so you can read it from the frame.

For e2e command testing, read state from the status bar which shows `Mode:`, `Scroll:`, `Theme:`, etc.
