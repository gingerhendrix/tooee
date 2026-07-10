/**
 * Text handed to `copyToClipboard` since the last `copied.length = 0`.
 *
 * `mock.module` binds the module registry process-wide, and a module already
 * imported keeps the factory that was registered when it first resolved. Two
 * test files stubbing `@tooee/clipboard` therefore cannot each own a private
 * array — whichever registered first keeps receiving the writes. They share
 * this one instead, and each file registers its own stub around it:
 *
 * ```ts
 * mock.module("@tooee/clipboard", () => clipboardStub())
 * ```
 *
 * The `mock.module` call must live in the test file: resolved from here it
 * targets a different module instance than the one under test imports.
 */
export const copied: string[] = []

export function clipboardStub() {
  return {
    copyToClipboard: (text: string) => {
      copied.push(text)
      return Promise.resolve()
    },
    copyToPrimary: () => Promise.resolve(),
    readClipboard: () => Promise.resolve(undefined),
    readClipboardText: () => Promise.resolve(""),
    readPrimaryText: () => Promise.resolve(""),
  }
}
