import { expect, mock, test } from "bun:test";
import { createStandaloneRouter } from "../src/standalone-router.js";
import { runLinkHandlers } from "../src/link-handlers.js";
import type { LinkHandlerContext } from "../src/link-handlers.js";

test("custom handlers consume synchronously or fall through to local navigation", async () => {
  const filePath = `${import.meta.dir}/fixtures/links/start.md`;
  const { documentRoute, router } = createStandaloneRouter({
    contentProvider: { load: () => ({ format: "markdown", markdown: "" }) },
    filePath,
  });
  await router.start();
  const toast = mock(() => {});
  const context: LinkHandlerContext = {
    command: {
      commands: { invoke: mock(() => {}), list: () => [] },
      exit: mock(() => {}),
      mode: "cursor",
      setMode: mock(() => {}),
      toast: { currentToast: null, dismiss: mock(() => {}), toast },
    },
    documentRoute,
    navigate: router,
  };
  const link = { baseDir: `${import.meta.dir}/fixtures/links`, href: "nested/target.md" };
  const later = mock(() => false);
  expect(runLinkHandlers([() => true, later], link, context)).toBe(true);
  expect(later).not.toHaveBeenCalled();
  expect(router.stack).toHaveLength(1);
  expect(toast).not.toHaveBeenCalled();

  const settled = Promise.withResolvers<boolean>();
  const unsubscribe = router.subscribeNavigation((event) => {
    if (event.type === "settled") {
      unsubscribe();
      settled.resolve(true);
    }
  });
  expect(runLinkHandlers([later], link, context)).toBe(true);
  await settled.promise;
  expect(later).toHaveBeenCalledTimes(1);
  expect(router.stack).toHaveLength(2);
  expect(router.currentRoute.params).toEqual({ path: `${link.baseDir}/nested/target.md` });

  runLinkHandlers([], { ...link, href: "missing.md" }, context);
  expect(toast).toHaveBeenLastCalledWith({
    level: "warning",
    message: "File not found: missing.md",
  });
  runLinkHandlers([], { ...link, href: "nested" }, context);
  expect(toast).toHaveBeenLastCalledWith({ level: "warning", message: "Not a file: nested" });
  runLinkHandlers([], { ...link, href: "https://example.com" }, context);
  expect(toast).toHaveBeenLastCalledWith({
    level: "warning",
    message: "Unsupported link: https://example.com",
  });
});
