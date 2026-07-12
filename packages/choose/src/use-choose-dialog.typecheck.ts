/**
 * Compile-time regression tests for the typed dialog generics. This module has
 * no runtime behaviour and is never imported; it exists so that `tsc -b`
 * (which only checks `src/`) fails if the public generic contract is ever
 * loosened.
 *
 * The contract (roadmap item 4): `useChooseDialog<T>().open(...)` retains the
 * consumer's item type without casts — single-select resolves `T | null`,
 * multi-select resolves `T[] | null` — and `toItem` may only be omitted when
 * `T` is itself a `ChooseItem`.
 */
import type { ChooseItem } from "./types.js";
import type { ChooseDialogHandle } from "./use-choose-dialog.js";

interface Model {
  id: string;
  label: string;
}

declare const modelDialog: ChooseDialogHandle<Model>;
declare const rowDialog: ChooseDialogHandle<ChooseItem>;
declare function expectType<T>(value: T): void;

// Never called; exists only to be typechecked.
export async function chooseDialogTypeChecks(): Promise<void> {
  // --- Single select resolves T | null, cast-free ---------------------------
  const single = await modelDialog.open({
    items: [{ id: "a", label: "A" }],
    toItem: (model) => ({ text: model.label }),
  });
  if (single !== null) {
    expectType<string>(single.id);
  }

  // --- Multi select resolves T[] | null, cast-free ---------------------------
  const multi = await modelDialog.open({
    items: [{ id: "a", label: "A" }],
    multi: true,
    toItem: (model) => ({ text: model.label }),
  });
  if (multi !== null) {
    expectType<string[]>(multi.map((model) => model.id));
  }

  // --- toItem may be omitted only when T is a ChooseItem ---------------------
  const row = await rowDialog.open({ items: [{ text: "one" }] });
  if (row !== null) {
    expectType<string>(row.text);
  }

  // @ts-expect-error toItem is required when T is not a ChooseItem
  await modelDialog.open({ items: [{ id: "a", label: "A" }] });

  // @ts-expect-error toItem must return a ChooseItem
  await modelDialog.open({ items: [{ id: "a", label: "A" }], toItem: (model) => model });

  // @ts-expect-error items must be T, not ChooseItem
  await modelDialog.open({ items: [{ text: "raw" }], toItem: (model) => ({ text: model.label }) });
}
