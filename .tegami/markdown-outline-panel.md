---
packages:
  "@tooee/view": minor
  "@tooee/layout": minor
  "@tooee/shell": minor
  "@tooee/renderers": minor
  "@tooee/cli": minor
---

## Markdown heading outline beside the document

The Markdown view can show an outline of its headings in a panel on the right. `g o` opens the outline and gives it focus. In the outline, `j` and `k` move, `g g` and `G` go to the first and last heading, `enter` moves the document cursor to the heading and returns to the document, `escape` returns to the document, and `g o` closes the outline. The heading that contains the cursor is marked, so the outline follows the document. A jump to a heading inside closed folds opens them. Below 60 columns the outline is hidden. `tab` keeps its multi-select meaning.

`tooee view --outline` and the `outline` option on `View` and `launch()` open the outline at start. `AppLayout` and `DocumentScreen` accept an `aside` region beside the content. `MarkdownView` accepts a `width`, and `@tooee/renderers` exports `getPlainText`.
