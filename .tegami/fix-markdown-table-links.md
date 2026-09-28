---
packages:
  "@tooee/renderers": patch
---

## Make links in Markdown table cells clickable

A left click on a link inside a Markdown table cell now calls the `onLinkActivate` handler, as it does for links in paragraphs, headings, lists, and blockquotes. This works in header cells, in wrapped cells, and in cells with more than one link. Table links also carry an OSC 8 hyperlink, so terminals that support OSC 8 can open them.
