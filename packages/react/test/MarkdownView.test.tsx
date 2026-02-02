import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/react"
import { MarkdownView } from "../src/components/MarkdownView.tsx"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("renders heading text", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content="# Hello World" />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Hello World")
  expect(frame).toContain("#")
})

test("renders list items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"- First item\n- Second item\n- Third item"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("First item")
  expect(frame).toContain("Second item")
  expect(frame).toContain("Third item")
})

test("renders code blocks", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```\nconst x = 1\n```"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("const x = 1")
})

test("renders markdown table", async () => {
  const md = `| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | London |
| Bob | 25 | Paris |`
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={md} />
    </ThemeSwitcherProvider>,
    { width: 60, height: 20 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Name")
  expect(frame).toContain("Alice")
  expect(frame).toContain("London")
  expect(frame).toContain("Bob")
})

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"# Title\n\nSome paragraph text.\n\n- Item one\n- Item two\n\n```js\nconst x = 1\n```"} />
    </ThemeSwitcherProvider>,
    { width: 60, height: 20 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toMatchSnapshot()
})
