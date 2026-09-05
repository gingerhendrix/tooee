import { createHunkDiffFilesFromPatch } from "hunkdiff/opentui";
import type { HunkDiffFile, HunkDiffFileInput, HunkDiffStats } from "hunkdiff/opentui";
import { SourceIndex } from "@tooee/renderers";
import type { DocumentRowSource } from "@tooee/renderers";

/**
 * What a navigation row stands for.
 *
 * - `file` — the file's header line (path, rename arrow, stats).
 * - `hunk` — one `@@` hunk of a file.
 * - `body` — a file Hunk renders without hunks (binary, too large, untracked);
 *   the whole file model is handed to the body renderer so it can draw its
 *   own notice.
 */
export type DiffRowKind = "file" | "hunk" | "body";

export interface DiffRow {
  kind: DiffRowKind;
  /** Stable identity across re-parses of the same patch. */
  key: string;
  /** Id of the owning file in the parsed model. */
  fileId: string;
  fileIndex: number;
  /** Hunk position within the file; `-1` for `file` and `body` rows. */
  hunkIndex: number;
  /**
   * The model handed to Hunk for this row. `hunk` rows carry a copy of the
   * owning file whose metadata is narrowed to a single hunk, so Hunk renders
   * exactly one hunk while still resolving line content and collapsed-gap
   * counts against the complete file.
   */
  file: HunkDiffFileInput;
  /** The owning file, unnarrowed. */
  parent: HunkDiffFile;
  /** Patch text for this row — the unit search and copy work in. */
  text: string;
  /** Provenance in the original patch text, or `null` when it cannot be resolved. */
  source: DocumentRowSource | null;
}

export interface DiffModel {
  /** Files as parsed by Hunk, in patch order. */
  files: HunkDiffFile[];
  rows: DiffRow[];
  /** Total additions/deletions across every file. */
  stats: HunkDiffStats;
  /** The patch text the model was built from. */
  patch: string;
}

// ---------------------------------------------------------------------------
// Patch scanning
// ---------------------------------------------------------------------------

interface PatchSection {
  start: number;
  end: number;
  /** End of the file's header lines: the offset of its first hunk, or `end`. */
  headerEnd: number;
  hunks: { start: number; end: number }[];
}

const GIT_HEADER = "diff --git ";
const OLD_FILE_HEADER = "--- ";
const HUNK_HEADER = "@@";

/**
 * Split patch text into per-file sections and per-hunk ranges, in offsets over
 * the original string.
 *
 * Hunk's parser does not expose source positions, so provenance is recovered by
 * scanning the same text. Both `diff --git` patches and bare unified diffs are
 * handled: a `--- ` line opens a new section only when it cannot belong to the
 * section already being read.
 */
export const scanPatchSections = function scanPatchSections(patch: string): PatchSection[] {
  const sections: PatchSection[] = [];

  const openSection = (start: number): PatchSection => {
    const section: PatchSection = { end: start, headerEnd: start, hunks: [], start };
    sections.push(section);
    return section;
  };

  let offset = 0;
  for (const line of patch.split("\n")) {
    const lineStart = offset;
    const lineEnd = offset + line.length + 1;
    offset = lineEnd;

    let current = sections.at(-1);
    if (
      line.startsWith(GIT_HEADER) ||
      (line.startsWith(OLD_FILE_HEADER) && (current === undefined || current.hunks.length > 0))
    ) {
      current = openSection(lineStart);
    } else if (line.startsWith(HUNK_HEADER)) {
      current ??= openSection(lineStart);
      if (current.hunks.length === 0) {
        current.headerEnd = lineStart;
      }
      current.hunks.push({ end: lineEnd, start: lineStart });
    }

    if (current === undefined) {
      continue;
    }
    current.end = lineEnd;
    const lastHunk = current.hunks.at(-1);
    if (lastHunk) {
      lastHunk.end = lineEnd;
    } else {
      current.headerEnd = lineEnd;
    }
  }

  // The trailing split entry after a final newline contributes no content.
  for (const section of sections) {
    section.end = Math.min(section.end, patch.length);
    section.headerEnd = Math.min(section.headerEnd, section.end);
    for (const hunk of section.hunks) {
      hunk.end = Math.min(hunk.end, section.end);
    }
  }

  return sections;
};

// ---------------------------------------------------------------------------
// Model construction
// ---------------------------------------------------------------------------

const HUNK_HEADER_CONTEXT_SEPARATOR = " @@ ";

/**
 * Hunk stores the full hunk header in `hunkSpecs` and also exposes the section
 * label as `hunkContext`. Its OpenTUI formatter joins those fields again, so a
 * header such as `@@ -1 +1 @@ function f()` can otherwise render the section
 * label twice. Keep the full source text in row.text, but pass Hunk a normalized
 * hunk model for drawing.
 */
const normalizeHunkHeaderForRender = function normalizeHunkHeaderForRender(
  hunk: HunkDiffFile["metadata"]["hunks"][number],
): HunkDiffFile["metadata"]["hunks"][number] {
  const { hunkContext, hunkSpecs } = hunk;
  if (
    hunkContext === undefined ||
    hunkContext.length === 0 ||
    hunkSpecs?.includes(HUNK_HEADER_CONTEXT_SEPARATOR) !== true
  ) {
    return hunk;
  }

  const [specs] = hunkSpecs.split(HUNK_HEADER_CONTEXT_SEPARATOR, 1);
  return { ...hunk, hunkSpecs: `${specs} @@` };
};

/** Narrow a file to a single hunk while keeping its whole-file line arrays. */
const narrowToHunk = function narrowToHunk(
  file: HunkDiffFile,
  hunkIndex: number,
): HunkDiffFileInput {
  const hunk = normalizeHunkHeaderForRender(file.metadata.hunks[hunkIndex]);
  return {
    ...file,
    id: `${file.id}#${hunkIndex}`,
    metadata: { ...file.metadata, hunks: [hunk] },
  };
};

interface FallbackHunkTexts {
  header: string;
  hunks: string[];
}

const fallbackHunkTexts = function fallbackHunkTexts(patch: string): FallbackHunkTexts {
  const header: string[] = [];
  const hunks: string[][] = [];
  let currentHunk: string[] | null = null;
  for (const line of patch.split("\n")) {
    if (line.startsWith(HUNK_HEADER)) {
      currentHunk = [line];
      hunks.push(currentHunk);
    } else if (currentHunk) {
      currentHunk.push(line);
    } else {
      header.push(line);
    }
  }
  return { header: header.join("\n"), hunks: hunks.map((lines) => lines.join("\n")) };
};

/**
 * Parse unified patch text into the navigation rows the diff subview and the
 * Markdown fence renderer share.
 *
 * Rows are `file` headers and `hunk` bodies so navigation, marks and the
 * cursor land on a hunk rather than on a whole file. Files Hunk renders without
 * hunks contribute a single `body` row instead.
 */
export const buildDiffModel = function buildDiffModel(patch: string, sourceId?: string): DiffModel {
  const files = createHunkDiffFilesFromPatch(patch, sourceId);
  const sections = scanPatchSections(patch);
  const aligned = sections.length === files.length ? sections : null;
  const index = new SourceIndex(patch, sourceId);

  const rows: DiffRow[] = [];
  for (const [fileIndex, file] of files.entries()) {
    const section = aligned?.[fileIndex];
    const fallback = fallbackHunkTexts(file.patch ?? "");
    const { hunks } = file.metadata;
    const hunkSpansAligned = section !== undefined && section.hunks.length === hunks.length;

    rows.push({
      file,
      fileId: file.id,
      fileIndex,
      hunkIndex: -1,
      key: `${file.id}:file`,
      kind: "file",
      parent: file,
      source: section ? { primary: index.span(section.start, section.headerEnd) } : null,
      text: section ? patch.slice(section.start, section.headerEnd) : fallback.header,
    });

    if (hunks.length === 0) {
      rows.push({
        file,
        fileId: file.id,
        fileIndex,
        hunkIndex: -1,
        key: `${file.id}:body`,
        kind: "body",
        parent: file,
        source: section ? { primary: index.span(section.start, section.end) } : null,
        text: section ? patch.slice(section.start, section.end) : (file.patch ?? ""),
      });
      continue;
    }

    for (const [hunkIndex] of hunks.entries()) {
      const span = hunkSpansAligned ? section.hunks[hunkIndex] : undefined;
      rows.push({
        file: narrowToHunk(file, hunkIndex),
        fileId: file.id,
        fileIndex,
        hunkIndex,
        key: `${file.id}:hunk:${hunkIndex}`,
        kind: "hunk",
        parent: file,
        source: span ? { primary: index.span(span.start, span.end) } : null,
        text: span ? patch.slice(span.start, span.end) : (fallback.hunks[hunkIndex] ?? ""),
      });
    }
  }

  let additions = 0;
  let deletions = 0;
  for (const file of files) {
    additions += file.stats.additions;
    deletions += file.stats.deletions;
  }

  return { files, patch, rows, stats: { additions, deletions } };
};

/** Row identity, text and provenance for a `DocumentController` over `DiffRow`s. */
export const diffRowAdapter = {
  getKey: (row: DiffRow): string => row.key,
  getSource: (row: DiffRow): DocumentRowSource | null => row.source,
  getText: (row: DiffRow): string => row.text,
};

export { countHunkDiffStats } from "hunkdiff/opentui";
