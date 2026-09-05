---
packages:
  "group:tooee": patch
---

## Keep terminal UI output out of shell results

Ask, Choose, and View now use the controlling terminal for interactive input and screen output when process streams carry piped or redirected data. Command substitution and pipelines receive clean result text. Piped View sessions remain interactive after stdin closes.
