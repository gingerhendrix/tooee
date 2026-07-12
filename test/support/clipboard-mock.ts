/**
 * Text handed to `copyToClipboard` since the last `copied.length = 0`.
 *
 * Bun shares its module registry across test files, so the suite preload owns
 * the single process-wide `@tooee/clipboard` mock and all clipboard assertions
 * share this sink. Registering mocks inside individual files is order-dependent:
 * `@tooee/shell` may already have captured the production clipboard binding.
 */
export const copied: string[] = [];

export const clipboardStub = function clipboardStub() {
  return {
    copyToClipboard: async (text: string) => {
      copied.push(text);
    },
    copyToPrimary: async () => {},
    readClipboard: async () => {},
    readClipboardText: async () => "",
    readPrimaryText: async () => "",
  };
};
