import { RGBA, SyntaxStyle } from "@opentui/core"
import type { ResolvedTheme } from "./types.js"

// ---------------------------------------------------------------------------
// SyntaxStyle builder
// ---------------------------------------------------------------------------

function getSyntaxRules(resolved: ResolvedTheme) {
  return [
    { scope: ["default"], style: { foreground: RGBA.fromHex(resolved.text) } },
    { scope: ["prompt"], style: { foreground: RGBA.fromHex(resolved.accent) } },
    {
      scope: ["comment", "comment.documentation"],
      style: { foreground: RGBA.fromHex(resolved.syntaxComment), italic: true },
    },
    { scope: ["string", "symbol"], style: { foreground: RGBA.fromHex(resolved.syntaxString) } },
    { scope: ["number", "boolean"], style: { foreground: RGBA.fromHex(resolved.syntaxNumber) } },
    { scope: ["character.special"], style: { foreground: RGBA.fromHex(resolved.syntaxString) } },
    {
      scope: ["keyword.return", "keyword.conditional", "keyword.repeat", "keyword.coroutine"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    {
      scope: ["keyword.type"],
      style: { foreground: RGBA.fromHex(resolved.syntaxType), bold: true, italic: true },
    },
    {
      scope: ["keyword.function", "function.method"],
      style: { foreground: RGBA.fromHex(resolved.syntaxFunction) },
    },
    {
      scope: ["keyword"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    { scope: ["keyword.import"], style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) } },
    {
      scope: ["operator", "keyword.operator", "punctuation.delimiter"],
      style: { foreground: RGBA.fromHex(resolved.syntaxOperator) },
    },
    {
      scope: ["keyword.conditional.ternary"],
      style: { foreground: RGBA.fromHex(resolved.syntaxOperator) },
    },
    {
      scope: ["variable", "variable.parameter", "function.method.call", "function.call"],
      style: { foreground: RGBA.fromHex(resolved.syntaxVariable) },
    },
    {
      scope: ["variable.member", "function", "constructor"],
      style: { foreground: RGBA.fromHex(resolved.syntaxFunction) },
    },
    { scope: ["type", "module"], style: { foreground: RGBA.fromHex(resolved.syntaxType) } },
    { scope: ["constant"], style: { foreground: RGBA.fromHex(resolved.syntaxNumber) } },
    { scope: ["property"], style: { foreground: RGBA.fromHex(resolved.syntaxVariable) } },
    { scope: ["class"], style: { foreground: RGBA.fromHex(resolved.syntaxType) } },
    { scope: ["parameter"], style: { foreground: RGBA.fromHex(resolved.syntaxVariable) } },
    {
      scope: ["punctuation", "punctuation.bracket"],
      style: { foreground: RGBA.fromHex(resolved.syntaxPunctuation) },
    },
    {
      scope: [
        "variable.builtin",
        "type.builtin",
        "function.builtin",
        "module.builtin",
        "constant.builtin",
      ],
      style: { foreground: RGBA.fromHex(resolved.error) },
    },
    { scope: ["variable.super"], style: { foreground: RGBA.fromHex(resolved.error) } },
    {
      scope: ["string.escape", "string.regexp"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) },
    },
    {
      scope: ["keyword.directive"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    {
      scope: ["punctuation.special"],
      style: { foreground: RGBA.fromHex(resolved.syntaxOperator) },
    },
    {
      scope: ["keyword.modifier"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    {
      scope: ["keyword.exception"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    // Markdown
    {
      scope: [
        "markup.heading",
        "markup.heading.1",
        "markup.heading.2",
        "markup.heading.3",
        "markup.heading.4",
        "markup.heading.5",
        "markup.heading.6",
      ],
      style: { foreground: RGBA.fromHex(resolved.markdownHeading), bold: true },
    },
    {
      scope: ["markup.bold", "markup.strong"],
      style: { foreground: RGBA.fromHex(resolved.markdownStrong), bold: true },
    },
    {
      scope: ["markup.italic"],
      style: { foreground: RGBA.fromHex(resolved.markdownEmph), italic: true },
    },
    { scope: ["markup.list"], style: { foreground: RGBA.fromHex(resolved.markdownListItem) } },
    {
      scope: ["markup.quote"],
      style: { foreground: RGBA.fromHex(resolved.markdownBlockQuote), italic: true },
    },
    {
      scope: ["markup.raw", "markup.raw.block"],
      style: { foreground: RGBA.fromHex(resolved.markdownCode) },
    },
    {
      scope: ["markup.raw.inline"],
      style: {
        foreground: RGBA.fromHex(resolved.markdownCode),
        background: RGBA.fromHex(resolved.background),
      },
    },
    {
      scope: ["markup.link"],
      style: { foreground: RGBA.fromHex(resolved.markdownLink), underline: true },
    },
    {
      scope: ["markup.link.label"],
      style: { foreground: RGBA.fromHex(resolved.markdownLinkText), underline: true },
    },
    {
      scope: ["markup.link.url"],
      style: { foreground: RGBA.fromHex(resolved.markdownLink), underline: true },
    },
    { scope: ["label"], style: { foreground: RGBA.fromHex(resolved.markdownLinkText) } },
    { scope: ["spell", "nospell"], style: { foreground: RGBA.fromHex(resolved.text) } },
    { scope: ["conceal"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
    {
      scope: ["string.special", "string.special.url"],
      style: { foreground: RGBA.fromHex(resolved.markdownLink), underline: true },
    },
    { scope: ["character"], style: { foreground: RGBA.fromHex(resolved.syntaxString) } },
    { scope: ["float"], style: { foreground: RGBA.fromHex(resolved.syntaxNumber) } },
    {
      scope: ["comment.error"],
      style: { foreground: RGBA.fromHex(resolved.error), italic: true, bold: true },
    },
    {
      scope: ["comment.warning"],
      style: { foreground: RGBA.fromHex(resolved.warning), italic: true, bold: true },
    },
    {
      scope: ["comment.todo", "comment.note"],
      style: { foreground: RGBA.fromHex(resolved.info), italic: true, bold: true },
    },
    { scope: ["namespace"], style: { foreground: RGBA.fromHex(resolved.syntaxType) } },
    { scope: ["field"], style: { foreground: RGBA.fromHex(resolved.syntaxVariable) } },
    {
      scope: ["type.definition"],
      style: { foreground: RGBA.fromHex(resolved.syntaxType), bold: true },
    },
    { scope: ["keyword.export"], style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) } },
    { scope: ["attribute", "annotation"], style: { foreground: RGBA.fromHex(resolved.warning) } },
    { scope: ["tag"], style: { foreground: RGBA.fromHex(resolved.error) } },
    { scope: ["tag.attribute"], style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) } },
    { scope: ["tag.delimiter"], style: { foreground: RGBA.fromHex(resolved.syntaxOperator) } },
    { scope: ["markup.strikethrough"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
    {
      scope: ["markup.underline"],
      style: { foreground: RGBA.fromHex(resolved.text), underline: true },
    },
    { scope: ["markup.list.checked"], style: { foreground: RGBA.fromHex(resolved.success) } },
    { scope: ["markup.list.unchecked"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
    {
      scope: ["diff.plus"],
      style: {
        foreground: RGBA.fromHex(resolved.diffAdded),
        background: RGBA.fromHex(resolved.diffAddedBg),
      },
    },
    {
      scope: ["diff.minus"],
      style: {
        foreground: RGBA.fromHex(resolved.diffRemoved),
        background: RGBA.fromHex(resolved.diffRemovedBg),
      },
    },
    {
      scope: ["diff.delta"],
      style: {
        foreground: RGBA.fromHex(resolved.diffContext),
        background: RGBA.fromHex(resolved.diffContextBg),
      },
    },
    { scope: ["error"], style: { foreground: RGBA.fromHex(resolved.error), bold: true } },
    { scope: ["warning"], style: { foreground: RGBA.fromHex(resolved.warning), bold: true } },
    { scope: ["info"], style: { foreground: RGBA.fromHex(resolved.info) } },
    { scope: ["debug"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
  ]
}

export function buildSyntaxStyle(resolved: ResolvedTheme): SyntaxStyle {
  return SyntaxStyle.fromTheme(getSyntaxRules(resolved))
}
