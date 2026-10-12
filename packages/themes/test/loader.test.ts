import { describe, expect, test } from "bun:test";
import path from "node:path";

import { projectThemeDirs } from "../src/loader.js";

describe("projectThemeDirs", () => {
  test("lists folders from the root down, so the nearest folder loads last", () => {
    const cwd = path.join(path.sep, "work", "repo", "app");

    expect(projectThemeDirs(cwd)).toEqual([
      path.join(path.sep, ".tooee", "themes"),
      path.join(path.sep, "work", ".tooee", "themes"),
      path.join(path.sep, "work", "repo", ".tooee", "themes"),
      path.join(path.sep, "work", "repo", "app", ".tooee", "themes"),
    ]);
  });
});
