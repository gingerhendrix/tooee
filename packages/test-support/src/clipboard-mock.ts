/**
 * Text handed to `copyToClipboard` since the last `copied.length = 0`.
 *
 * Bun shares its module registry across test files, so the suite preload owns
 * the single process-wide `@tooee/clipboard` mock and all clipboard assertions
 * share this sink. Registering mocks inside individual files is order-dependent:
 * `@tooee/shell` may already have captured the production clipboard binding.
 */
export const copied: string[] = [];

/** Set `available` to false to make the mock report that no clipboard tool exists. */
export const clipboardMockState = { available: true };

export const clipboardStub = function clipboardStub() {
  return {
    copyToClipboard: async (text: string) => {
      if (!clipboardMockState.available) {
        return await Promise.resolve(false);
      }

      copied.push(text);

      return await Promise.resolve(true);
    },
    copyToPrimary: async () => {
      // The mock intentionally performs no primary-selection I/O.
    },
    readClipboard: async () => {
      // The mock intentionally performs no clipboard I/O.
    },
    readClipboardText: () => "",
    readPrimaryText: () => "",
  };
};
