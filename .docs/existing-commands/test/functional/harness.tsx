import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard, useRenderer } from "@opentui/react"
import { useState } from "react"
import { CommandProvider, useCommand } from "../../src/index.ts"

function Commands() {
  const [log, setLog] = useState<string[]>([])

  const append = (msg: string) => setLog((prev) => [...prev, msg])

  // Single modifier combo: ctrl+s
  useCommand({
    id: "save",
    title: "Save",
    hotkey: "ctrl+s",
    handler: () => append("FIRED:save"),
  })

  // Plain key: q
  useCommand({
    id: "quit",
    title: "Quit",
    hotkey: "q",
    handler: () => append("FIRED:quit"),
  })

  // Sequence: g g
  useCommand({
    id: "go-top",
    title: "Go to top",
    hotkey: "g g",
    handler: () => append("FIRED:go-top"),
  })

  // Another modifier combo: ctrl+shift+p
  useCommand({
    id: "palette",
    title: "Command Palette",
    hotkey: "ctrl+shift+p",
    handler: () => append("FIRED:palette"),
  })

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%" }}>
      <text content="ready" />
      {log.map((msg, i) => (
        <text key={i} content={msg} />
      ))}
    </box>
  )
}

function App() {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer?.stop()
      process.exit(0)
    }
  })

  return (
    <CommandProvider>
      <Commands />
    </CommandProvider>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
