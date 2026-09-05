import type { ChooseContentProvider, ChooseItem, ChooseSource } from "./types.js";

type DecodedChooseSource =
  | { kind: "items"; items: ChooseItem[] }
  | { kind: "loader"; load: () => ChooseItem[] | Promise<ChooseItem[]> }
  | { kind: "provider"; provider: ChooseContentProvider };

const decodeChooseSource = function decodeChooseSource(source: ChooseSource): DecodedChooseSource {
  if (Array.isArray(source)) {
    return { items: source, kind: "items" };
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- public source boundary distinguishes the documented loader callback from a provider
  if (typeof source === "function") {
    return { kind: "loader", load: source };
  }
  return { kind: "provider", provider: source };
};

/** Resolve every public Choose source shape through one compatibility boundary. */
export const loadChooseSource = function loadChooseSource(
  source: ChooseSource,
): ChooseItem[] | Promise<ChooseItem[]> {
  const decoded = decodeChooseSource(source);
  if (decoded.kind === "items") {
    return decoded.items;
  }
  if (decoded.kind === "loader") {
    return decoded.load();
  }
  return decoded.provider.load();
};

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- caught loader failures enter here before conversion to display text
export const chooseSourceError = function chooseSourceError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
};
