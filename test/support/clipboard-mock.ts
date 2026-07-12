/**
 * Text handed to `copyToClipboard` since the last `copied.length = 0`.
 *
 * Bun shares its module registry across test files, so the suite preload owns
 * the single process-wide `@tooee/clipboard` mock and all clipboard assertions
 * share this sink. Registering mocks inside individual files is order-dependent:
 * `@tooee/shell` may already have captured the production clipboard binding.
 */
export const copied: string[] = [];

export function clipboardStub() {
  return {
    copyToClipboard: (text: string) => {
      copied.push(text);
      return Promise.resolve();
    },
    copyToPrimary: () => Promise.resolve(),
    readClipboard: () => Promise.resolve(),
    readClipboardText: () => Promise.resolve(""),
    readPrimaryText: () => Promise.resolve(""),
  };
}
