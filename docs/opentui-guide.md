# OpenTUI Practical Guide

> A comprehensive reference for building terminal apps with `@opentui/react` and `@opentui/core`.

## Table of Contents

1. [Rendering & Launching an App](#1-rendering--launching-an-app)
2. [Available JSX Elements](#2-available-jsx-elements)
3. [Hooks](#3-hooks)
4. [ScrollBox](#4-scrollbox)
5. [Input](#5-input)
6. [TypeScript Types](#6-typescript-types)
7. [Module Structure](#7-module-structure)
8. [TSConfig](#8-tsconfig)

---

## 1. Rendering & Launching an App

### Starting an App

```tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"

function App() {
  return <text>Hello, world!</text>
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
```

`createCliRenderer()` is async — it initializes the Zig-based terminal renderer, takes over stdin/stdout, and sets up the alternate screen buffer.

### Renderer Configuration

```tsx
const renderer = await createCliRenderer({
  exitOnCtrlC: true,           // Default: handle Ctrl+C to exit (set false to handle yourself)
  exitSignals: ["SIGINT"],     // OS signals that trigger cleanup
  targetFps: 60,               // Render loop FPS cap
  maxFps: 120,
  useMouse: true,              // Enable mouse events
  enableMouseMovement: false,  // Mouse move tracking (expensive)
  useAlternateScreen: true,    // Use alternate terminal screen
  useConsole: true,            // Capture console.log into overlay
  backgroundColor: "#1a1b26", // Default background color
  onDestroy: () => {},         // Cleanup callback
  consoleOptions: {
    position: "bottom",        // "top" | "bottom" | "left" | "right"
    sizePercent: 30,
    startInDebugMode: false,
  },
})
```

Full `CliRendererConfig` interface:

```ts
interface CliRendererConfig {
  stdin?: NodeJS.ReadStream
  stdout?: NodeJS.WriteStream
  exitOnCtrlC?: boolean
  exitSignals?: NodeJS.Signals[]
  debounceDelay?: number
  targetFps?: number
  maxFps?: number
  useThread?: boolean
  consoleOptions?: ConsoleOptions
  postProcessFns?: ((buffer: OptimizedBuffer, deltaTime: number) => void)[]
  enableMouseMovement?: boolean
  useMouse?: boolean
  useAlternateScreen?: boolean
  useConsole?: boolean
  backgroundColor?: ColorInput
  openConsoleOnError?: boolean
  onDestroy?: () => void
}
```

### Exiting

```tsx
// Option 1: Let exitOnCtrlC handle it (default behavior)
const renderer = await createCliRenderer({ exitOnCtrlC: true })

// Option 2: Manual exit via process.exit()
useKeyboard((key) => {
  if (key.name === "escape") process.exit(0)
})

// Option 3: Call renderer.destroy() directly
const renderer = useRenderer()
renderer.destroy() // Cleans up terminal, restores stdin/stdout
```

`renderer.destroy()` restores the terminal to its original state (exits alternate screen, re-enables cursor, etc.). `process.exit()` also triggers cleanup via exit signal handlers.

### The `render()` API (Deprecated)

```tsx
// OLD — deprecated
import { render } from "@opentui/react"
render(<App />)

// NEW — use createRoot
import { createRoot } from "@opentui/react"
const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
```

---

## 2. Available JSX Elements

### Layout & Display

#### `<text>`

Display text with rich formatting. Accepts children for inline modifiers.

```tsx
<text>Plain text</text>
<text fg="#FF0000">Red text</text>
<text fg="green" bg="black">Colored text</text>
<text content="Also works with content prop" />
<text>
  <strong>Bold</strong>, <em>Italic</em>, and <u>Underlined</u>
  <br />
  <span fg="red">Red span</span> and <span fg="blue">blue span</span>
</text>
```

Props: `content`, `fg`, `bg`, `attributes` (TextAttributes bitmask), plus all layout/style props.

#### `<box>`

Container with borders, padding, flexbox layout.

```tsx
<box flexDirection="column" padding={2}>
  <text>Child 1</text>
  <text>Child 2</text>
</box>

<box
  title="Panel Title"
  border
  borderStyle="double"   // "single" | "double" | "round" | "bold"
  borderColor="#4a4a4a"
  backgroundColor="blue"
  style={{
    width: 40,
    height: 10,
    margin: 1,
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <text>Centered content</text>
</box>
```

Props: `title`, `titleAlignment`, `border` (boolean), `borderStyle`, `borderColor`, `backgroundColor`, plus all Yoga layout props.

#### `<scrollbox>`

Scrollable container with scrollbar. See [Section 4](#4-scrollbox) for details.

#### `<ascii-font>`

ASCII art text rendering.

```tsx
<ascii-font text="HELLO" font="tiny" />  // fonts: "block" | "shade" | "slick" | "tiny"
```

### Text Modifiers (must be inside `<text>`)

```tsx
<text>
  <span fg="red" bg="blue">Colored</span>
  <strong>Bold</strong>  {/* alias: <b> */}
  <em>Italic</em>        {/* alias: <i> */}
  <u>Underline</u>
  <br />                  {/* Line break */}
  <a href="https://...">Link</a>
</text>
```

### Input Components

#### `<input>`

Single-line text input. See [Section 5](#5-input) for details.

#### `<textarea>`

Multi-line text editor.

```tsx
import type { TextareaRenderable } from "@opentui/core"
import { useRef } from "react"

const textareaRef = useRef<TextareaRenderable>(null)

<textarea
  ref={textareaRef}
  placeholder="Type here..."
  focused
/>

// Access value: textareaRef.current?.plainText
```

Props: `placeholder`, `initialValue`, `focused`.

#### `<select>`

Dropdown selection list.

```tsx
import type { SelectOption } from "@opentui/core"

const options: SelectOption[] = [
  { name: "Option 1", description: "Description", value: "opt1" },
  { name: "Option 2", description: "Description", value: "opt2" },
]

<select
  options={options}
  focused
  showScrollIndicator
  onChange={(index, option) => console.log(option?.value)}
  onSelect={(index, option) => console.log("selected", option)}
/>
```

Props: `options` (SelectOption[]), `focused`, `showScrollIndicator`, `onChange`, `onSelect`.

Navigation: `up`/`k` and `down`/`j` to navigate, `enter` to select.

#### `<tab-select>`

Horizontal tab navigation.

```tsx
<tab-select
  options={[
    { name: "Tab 1", description: "First tab" },
    { name: "Tab 2", description: "Second tab" },
  ]}
  tabWidth={20}
  focused
  onChange={(index, option) => {}}
/>
```

Navigation: `left`/`[` and `right`/`]` to navigate.

### Code & Diff Components

#### `<code>`

Syntax-highlighted code block.

```tsx
import { RGBA, SyntaxStyle } from "@opentui/core"

const syntaxStyle = SyntaxStyle.fromStyles({
  keyword: { fg: RGBA.fromHex("#ff6b6b"), bold: true },
  string: { fg: RGBA.fromHex("#51cf66") },
  comment: { fg: RGBA.fromHex("#868e96"), italic: true },
  number: { fg: RGBA.fromHex("#ffd43b") },
  default: { fg: RGBA.fromHex("#ffffff") },
})

<code
  content={sourceCode}
  filetype="typescript"      // Language for syntax highlighting
  syntaxStyle={syntaxStyle}  // Optional custom theme
  streaming={true}           // For progressive rendering
/>
```

Props: `content`, `filetype`, `syntaxStyle`, `streaming`, `conceal`, `treeSitterClient`, `drawUnstyledText`.

#### `<line-number>`

Code with line numbers and diagnostic annotations. Wraps a `<code>` child.

```tsx
import type { LineNumberRenderable } from "@opentui/core"

const ref = useRef<LineNumberRenderable>(null)

<line-number
  ref={ref}
  fg="#6b7280"
  bg="#161b22"
  minWidth={3}
  paddingRight={1}
  showLineNumbers
>
  <code content={code} filetype="typescript" />
</line-number>

// Programmatic annotations:
ref.current?.setLineColor(1, "#1a4d1a")           // Highlight line background
ref.current?.setLineSign(1, {                      // Add gutter signs
  after: " +", afterColor: "#22c55e"
})
ref.current?.setLineSign(4, {
  before: "⚠️", beforeColor: "#f59e0b"
})
```

#### `<diff>`

Unified or split diff viewer.

```tsx
<diff
  diff={unifiedDiffString}
  view="unified"         // "unified" | "split"
  filetype="typescript"  // For syntax highlighting
/>
```

---

## 3. Hooks

### `useRenderer()`

Access the `CliRenderer` instance.

```tsx
import { useRenderer } from "@opentui/react"

const renderer = useRenderer()
// renderer.console.show()   — show debug console
// renderer.console.toggle() — toggle console
// renderer.destroy()        — exit cleanly
// renderer.width / renderer.height — terminal dimensions
// renderer.root             — root renderable
```

**Returns:** `CliRenderer`

### `useKeyboard(handler, options?)`

Subscribe to keyboard events.

```tsx
import { useKeyboard } from "@opentui/react"
import type { KeyEvent } from "@opentui/core"

// Basic usage — press events only (includes repeats)
useKeyboard((key: KeyEvent) => {
  // key.name: string        — key name ("a", "escape", "return", "up", "f1", etc.)
  // key.sequence: string    — raw input sequence
  // key.ctrl: boolean       — Ctrl held
  // key.shift: boolean      — Shift held
  // key.meta: boolean       — Alt/Meta held
  // key.option: boolean     — Option held (macOS)
  // key.repeated: boolean   — key repeat event
  // key.eventType: "press" | "release"

  if (key.name === "escape") process.exit(0)
  if (key.ctrl && key.name === "c") { /* ... */ }
})

// With release events
useKeyboard(
  (key) => {
    if (key.eventType === "release") { /* key released */ }
    else { /* key pressed */ }
  },
  { release: true }
)
```

**Signature:**
```ts
function useKeyboard(
  handler: (key: KeyEvent) => void,
  options?: { release?: boolean }
): void
```

### `useTerminalDimensions()`

Get reactive terminal dimensions that auto-update on resize.

```tsx
import { useTerminalDimensions } from "@opentui/react"

const { width, height } = useTerminalDimensions()
```

**Returns:** `{ width: number, height: number }`

### `useOnResize(callback)`

Handle terminal resize events directly.

```tsx
import { useOnResize } from "@opentui/react"

useOnResize((width: number, height: number) => {
  console.log(`Resized to ${width}x${height}`)
})
```

**Signature:**
```ts
function useOnResize(callback: (width: number, height: number) => void): void
```

### `useTimeline(options?)`

Create animations.

```tsx
import { useTimeline } from "@opentui/react"

const timeline = useTimeline({
  duration: 2000,     // ms
  loop: false,
  autoplay: true,     // default: true
  onComplete: () => {},
  onPause: () => {},
})

// Add animation targets
timeline.add(
  targetObject,          // Object with numeric properties to animate
  {
    propertyName: 50,    // Target value
    duration: 2000,
    ease: "linear",
    onUpdate: (animation) => {
      // animation.targets[0].propertyName has current value
    },
  },
  0  // startTime offset
)

timeline.play()
timeline.pause()
timeline.restart()
```

**Signature:**
```ts
function useTimeline(options?: {
  duration?: number
  loop?: boolean
  autoplay?: boolean
  onComplete?: () => void
  onPause?: () => void
}): Timeline
```

---

## 4. ScrollBox

### Basic Usage

```tsx
<scrollbox focused style={{ flexGrow: 1 }}>
  {items.map((item, i) => (
    <box key={i}>
      <text>{item}</text>
    </box>
  ))}
</scrollbox>
```

### Sticky Scroll (auto-scroll to bottom)

```tsx
<scrollbox
  focused
  stickyScroll        // Enable auto-scroll when new content added
  stickyStart="bottom" // Start scrolled to bottom
  style={{ flexGrow: 1 }}
>
  {messages.map(msg => <text key={msg.id}>{msg.text}</text>)}
</scrollbox>
```

When `stickyScroll` is enabled and the user is scrolled to the bottom, new content automatically scrolls into view. If the user manually scrolls up, sticky scroll pauses until they scroll back to the bottom.

### ScrollBox Options

```ts
interface ScrollBoxOptions extends BoxOptions {
  // Sub-component styling
  rootOptions?: BoxOptions
  wrapperOptions?: BoxOptions
  viewportOptions?: BoxOptions
  contentOptions?: BoxOptions

  // Scrollbar customization
  scrollbarOptions?: {
    showArrows?: boolean
    trackOptions?: {
      foregroundColor?: ColorInput
      backgroundColor?: ColorInput
    }
  }
  verticalScrollbarOptions?: ScrollBarOptions
  horizontalScrollbarOptions?: ScrollBarOptions

  // Scroll behavior
  stickyScroll?: boolean
  stickyStart?: "bottom" | "top" | "left" | "right"
  scrollX?: boolean            // Enable horizontal scrolling
  scrollY?: boolean            // Enable vertical scrolling (default: true)
  scrollAcceleration?: ScrollAcceleration
  viewportCulling?: boolean    // Only render visible children (performance)
}
```

### Programmatic Scroll Control

Via ref:

```tsx
import type { ScrollBoxRenderable } from "@opentui/core"

const scrollRef = useRef<ScrollBoxRenderable>(null)

// Read/write scroll position
scrollRef.current.scrollTop         // get current vertical scroll position
scrollRef.current.scrollTop = 100   // set scroll position

// Sticky scroll control
scrollRef.current.stickyScroll = true
scrollRef.current.stickyStart = "bottom"
```

### Styled ScrollBox

```tsx
<scrollbox
  focused
  style={{
    flexGrow: 1,
    rootOptions: { backgroundColor: "#24283b" },
    wrapperOptions: { backgroundColor: "#1f2335" },
    viewportOptions: { backgroundColor: "#1a1b26" },
    contentOptions: { backgroundColor: "#16161e" },
    scrollbarOptions: {
      showArrows: true,
      trackOptions: {
        foregroundColor: "#7aa2f7",
        backgroundColor: "#414868",
      },
    },
  }}
>
  {children}
</scrollbox>
```

### Keyboard Scrolling

When a `<scrollbox>` has `focused`, it responds to arrow keys / page up / page down for scrolling. You don't need to wire up keyboard events manually.

---

## 5. Input

### Basic Usage

```tsx
import { useState } from "react"

const [value, setValue] = useState("")

<input
  placeholder="Type here..."
  focused
  onInput={setValue}                          // Called on every keystroke
  onSubmit={(value) => console.log(value)}   // Called on Enter
  onChange={(value) => console.log(value)}    // Alias for onSubmit
/>
```

### All Input Props

```ts
interface InputProps {
  // Content
  value?: string              // Controlled value
  placeholder?: string        // Placeholder text
  maxLength?: number          // Max input length (default: 1000)

  // Focus
  focused?: boolean           // Whether this input receives keystrokes

  // Events
  onInput?: (value: string) => void   // Every keystroke
  onChange?: (value: string) => void   // On Enter/submit
  onSubmit?: (value: string) => void  // On Enter/submit (same as onChange)

  // Colors
  backgroundColor?: ColorInput           // Default: "transparent"
  textColor?: ColorInput                 // Default: "#FFFFFF"
  focusedBackgroundColor?: ColorInput    // Default: "#1a1a1a"
  focusedTextColor?: ColorInput          // Default: "#FFFFFF"
  placeholderColor?: ColorInput          // Default: "#666666"
  cursorColor?: ColorInput               // Default: "#FFFFFF"
  cursorStyle?: { style: "block" | "bar" | "underline", blinking: boolean }

  // Key bindings
  keyBindings?: InputKeyBinding[]    // Custom keybindings
  keyAliasMap?: KeyAliasMap          // Key aliases

  // Layout (all Yoga props)
  style?: Partial<InputRenderableOptions>
  ref?: React.Ref<InputRenderable>
}
```

### Default Key Bindings

| Key | Action |
|-----|--------|
| `←` / `Ctrl+B` | Move cursor left |
| `→` / `Ctrl+F` | Move cursor right |
| `Home` / `Ctrl+A` | Move to start |
| `End` / `Ctrl+E` | Move to end |
| `Backspace` | Delete backward |
| `Delete` / `Ctrl+D` | Delete forward |
| `Enter` | Submit |

### Styling an Input

```tsx
<box title="Username" style={{ border: true, height: 3, width: 40 }}>
  <input
    placeholder="Enter username..."
    focused
    backgroundColor="transparent"
    focusedBackgroundColor="#1a1a2e"
    textColor="#e0e0e0"
    placeholderColor="#555555"
    cursorColor="#7aa2f7"
    cursorStyle={{ style: "bar", blinking: true }}
    onInput={setUsername}
    onSubmit={handleLogin}
  />
</box>
```

### Textarea vs Input

| Feature | `<input>` | `<textarea>` |
|---------|-----------|--------------|
| Lines | Single-line | Multi-line |
| Submit | Enter key | Configurable |
| Value access | `onInput` callback | `ref.current.plainText` |
| Controlled | `value` + `onInput` | `initialValue` + ref |

---

## 6. TypeScript Types

### Key Types from `@opentui/core`

```ts
// Renderer
import { createCliRenderer, type CliRenderer, type CliRendererConfig } from "@opentui/core"

// Colors
import { RGBA, parseColor, type ColorInput } from "@opentui/core"
// ColorInput = string | RGBA (hex strings, CSS names, RGBA objects)

// Renderables (for refs and extension)
import type {
  BoxRenderable,
  TextRenderable,
  InputRenderable,
  TextareaRenderable,
  ScrollBoxRenderable,
  SelectRenderable,
  TabSelectRenderable,
  CodeRenderable,
  LineNumberRenderable,
  DiffRenderable,
  ASCIIFontRenderable,
  FrameBufferRenderable,
  BaseRenderable,
} from "@opentui/core"

// Options types (for custom components)
import type {
  BoxOptions,
  TextOptions,
  InputRenderableOptions,
  TextareaOptions,
  ScrollBoxOptions,
  SelectRenderableOptions,
  TabSelectRenderableOptions,
  CodeOptions,
  LineNumberOptions,
  DiffRenderableOptions,
  ASCIIFontOptions,
  RenderableOptions,
  RenderContext,
} from "@opentui/core"

// Events
import type { KeyEvent } from "@opentui/core"
import { InputRenderableEvents } from "@opentui/core"  // "input" | "change" | "enter"

// Select
import type { SelectOption, TabSelectOption } from "@opentui/core"
// SelectOption = { name: string, description?: string, value?: any }

// Syntax highlighting
import { SyntaxStyle, TextAttributes } from "@opentui/core"

// Layout
import * as Yoga from "@opentui/core"  // Re-exports yoga-layout

// Buffer (for custom renderables)
import { OptimizedBuffer } from "@opentui/core"
```

### Key Types from `@opentui/react`

```ts
// Entry point
import { createRoot, extend } from "@opentui/react"

// Hooks
import {
  useRenderer,
  useKeyboard,
  useTerminalDimensions,
  useOnResize,
  useTimeline,
} from "@opentui/react"

// Hook option types
import type { UseKeyboardOptions } from "@opentui/react"

// Component prop types
import type {
  TextProps,
  BoxProps,
  InputProps,
  TextareaProps,
  SelectProps,
  TabSelectProps,
  ScrollBoxProps,
  CodeProps,
  DiffProps,
  LineNumberProps,
  AsciiFontProps,
  SpanProps,
  LinkProps,
  LineBreakProps,
} from "@opentui/react"

// Extension system
import type {
  OpenTUIComponents,
  ExtendedComponentProps,
  ExtendedIntrinsicElements,
  RenderableConstructor,
} from "@opentui/react"
```

---

## 7. Module Structure

### `@opentui/core`

The foundational package. Everything render-related lives here.

| Export | Description |
|--------|-------------|
| `createCliRenderer()` | Create the terminal renderer |
| `CliRenderer` | Renderer class |
| `RGBA`, `parseColor` | Color utilities |
| `SyntaxStyle` | Syntax highlighting themes |
| `TextAttributes` | Text formatting bitmask (BOLD, ITALIC, UNDERLINE, DIM, etc.) |
| `OptimizedBuffer` | Low-level render buffer |
| `*Renderable` classes | All renderable implementations |
| `*Options` types | Options for each renderable |
| `*Events` enums | Event name constants |
| `Yoga` (re-export) | Yoga layout engine |
| `t`, `bold`, `underline`, `fg` | Styled text template utilities |

### `@opentui/react`

React reconciler and component bindings.

| Export | Description |
|--------|-------------|
| `createRoot(renderer)` | Create React root for rendering |
| `render()` | Deprecated — use createRoot |
| `extend(components)` | Register custom JSX elements |
| `useRenderer()` | Access CliRenderer |
| `useKeyboard()` | Keyboard event hook |
| `useTerminalDimensions()` | Reactive terminal size |
| `useOnResize()` | Resize event hook |
| `useTimeline()` | Animation hook |
| `createElement` | Re-exported from React |
| Component prop types | `TextProps`, `BoxProps`, `InputProps`, etc. |
| Extension types | `OpenTUIComponents`, `ExtendedComponentProps` |

### JSX Element Mapping

The React package maps JSX element names to core renderables:

```
box         → BoxRenderable
text        → TextRenderable
code        → CodeRenderable
diff        → DiffRenderable
input       → InputRenderable
select      → SelectRenderable
textarea    → TextareaRenderable
scrollbox   → ScrollBoxRenderable
ascii-font  → ASCIIFontRenderable
tab-select  → TabSelectRenderable
line-number → LineNumberRenderable
span        → SpanRenderable
br          → LineBreakRenderable
b / strong  → BoldSpanRenderable
i / em      → ItalicSpanRenderable
u           → UnderlineSpanRenderable
a           → LinkRenderable
```

---

## 8. TSConfig

### Required Configuration

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "strict": true,
    "skipLibCheck": true
  }
}
```

**Critical settings:**

| Setting | Value | Why |
|---------|-------|-----|
| `jsx` | `"react-jsx"` | Uses the automatic JSX transform (no manual `import React`) |
| `jsxImportSource` | `"@opentui/react"` | Routes JSX to OpenTUI's custom element types instead of HTML |
| `moduleResolution` | `"bundler"` | Required for Bun and package exports resolution |
| `lib` | `["ESNext", "DOM"]` | DOM needed for some React types; ESNext for modern APIs |
| `target` | `"ESNext"` | Bun supports all modern JS features |
| `skipLibCheck` | `true` | Avoids issues with third-party type conflicts |

### Without `jsxImportSource`

If you can't use `jsxImportSource`, you'd need to explicitly import createElement:

```tsx
import { createElement } from "@opentui/react"
// and set jsx: "react" instead of "react-jsx"
```

But `jsxImportSource` is the recommended approach.

---

## Layout System Reference

OpenTUI uses Yoga (CSS Flexbox) for layout. All layout props can be passed directly or via `style`.

### Common Layout Props

```tsx
// Direction
flexDirection: "row" | "column" | "row-reverse" | "column-reverse"

// Alignment
justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly"
alignItems: "flex-start" | "center" | "flex-end" | "stretch"
alignSelf: "auto" | "flex-start" | "center" | "flex-end" | "stretch"

// Sizing
width: number | `${number}%`
height: number | `${number}%`
minWidth / maxWidth / minHeight / maxHeight: number
flexGrow: number      // How much to grow (default: 0)
flexShrink: number    // How much to shrink (default: 1)
flexBasis: number | "auto"

// Spacing
padding: number       // All sides
paddingLeft / paddingRight / paddingTop / paddingBottom: number
margin: number        // All sides
marginLeft / marginRight / marginTop / marginBottom: number
gap: number           // Gap between children

// Position
position: "relative" | "absolute"
left / right / top / bottom: number
```

### Colors

```tsx
// Hex strings
fg="#FF0000"
backgroundColor="#1a1b26"

// CSS color names
fg="red"
backgroundColor="blue"

// RGBA objects (for programmatic use)
import { RGBA } from "@opentui/core"
const color = RGBA.fromHex("#FF0000")
const color2 = RGBA.fromInts(255, 0, 0, 255)
const color3 = RGBA.fromValues(1.0, 0.0, 0.0, 1.0) // floats 0-1
```

---

## Common Patterns

### Focus Management

Only one component should be focused at a time. Track focus with state:

```tsx
const [focus, setFocus] = useState<"messages" | "input">("input")

useKeyboard((key) => {
  if (key.name === "tab") {
    setFocus(f => f === "input" ? "messages" : "input")
  }
})

<scrollbox focused={focus === "messages"}>...</scrollbox>
<input focused={focus === "input"} />
```

### Debug Console

```tsx
const renderer = useRenderer()

useEffect(() => {
  renderer.console.show()  // Show the overlay
}, [])

// Now console.log() output appears in the overlay instead of corrupting the TUI
console.log("Debug info")
```

Toggle with `renderer.console.toggle()`. When focused, arrow keys scroll. `+`/`-` resize.

### Custom Components via `extend()`

```tsx
import { BoxRenderable, OptimizedBuffer, RGBA, type BoxOptions, type RenderContext } from "@opentui/core"
import { extend } from "@opentui/react"

class MyRenderable extends BoxRenderable {
  constructor(ctx: RenderContext, options: BoxOptions & { customProp?: string }) {
    super(ctx, options)
  }

  protected renderSelf(buffer: OptimizedBuffer): void {
    super.renderSelf(buffer)
    // Custom rendering...
  }
}

// Type augmentation for JSX
declare module "@opentui/react" {
  interface OpenTUIComponents {
    "my-component": typeof MyRenderable
  }
}

extend({ "my-component": MyRenderable })

// Use in JSX
<my-component customProp="hello" style={{ width: 20 }} />
```

### Full App Template

```tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react"
import { useState } from "react"

function App() {
  const { width, height } = useTerminalDimensions()
  const [messages, setMessages] = useState<string[]>([])
  const [focus, setFocus] = useState<"scroll" | "input">("input")

  useKeyboard((key) => {
    if (key.name === "escape") process.exit(0)
    if (key.name === "tab") setFocus(f => f === "input" ? "scroll" : "input")
  })

  return (
    <box flexDirection="column" height="100%">
      <scrollbox
        focused={focus === "scroll"}
        stickyScroll
        stickyStart="bottom"
        style={{ flexGrow: 1 }}
      >
        {messages.map((msg, i) => (
          <box key={i} style={{ marginBottom: 1 }}>
            <text>{msg}</text>
          </box>
        ))}
      </scrollbox>

      <box title="Input" style={{ border: true, height: 3 }}>
        <input
          placeholder="Type a message..."
          focused={focus === "input"}
          onSubmit={(value) => {
            setMessages(prev => [...prev, value])
          }}
        />
      </box>
    </box>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
```

---

## Important Notes

- **Runtime**: Use **Bun**, not Node.js. OpenTUI has Zig native bindings that work with Bun.
- **Console output**: `console.log()` is captured by OpenTUI's console overlay. It won't appear in stdout. Use the debug console overlay or test cases for debugging.
- **No build step needed**: TypeScript changes don't need a build step — only native Zig code does.
- **Zig dependency**: Zig must be installed on the system for building native components from source.
- **React version**: Uses React 19 patterns (automatic JSX transform, no need to import React).
