---
packages:
  "@tooee/mermaid-pele": minor
---

## Stop capping Mermaid diagram images at 40 rows

`createPeleMermaidRenderer` no longer limits a diagram image to 40 rows by default. A tall diagram keeps its natural height and the view scrolls. Only the code block width shrinks a diagram. Pass `maxRows` to restore a row cap.
