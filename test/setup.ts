import { mock } from "bun:test";
import { clipboardStub } from "./support/clipboard-mock.ts";

// Register before any test can load @tooee/shell, whose copy command keeps its
// imported clipboard binding for the lifetime of the shared Bun test process.
mock.module("@tooee/clipboard", () => clipboardStub());
