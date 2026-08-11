/** Lines that only appear at the start of a unified diff. */
const GIT_HEADER = /^diff --git /mu;
const UNIFIED_HEADERS = /^--- .*\n\+\+\+ /mu;
const HUNK_HEADER = /^@@ -\d/mu;

/**
 * Whether text looks like a unified patch.
 *
 * Used to route extension-less input (stdin, files without a `.patch`/`.diff`
 * suffix) to the diff viewer. A hunk header is required as well as a file
 * header so prose containing a stray `--- ` rule is not mistaken for a diff.
 */
export const isDiffPatch = function isDiffPatch(text: string): boolean {
  if (!HUNK_HEADER.test(text)) {
    return false;
  }
  return GIT_HEADER.test(text) || UNIFIED_HEADERS.test(text);
};
