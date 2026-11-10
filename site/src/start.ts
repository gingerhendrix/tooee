import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";

import { docsRoute, getPageMarkdownUrl } from "#/lib/shared";

const llmMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const isDocsPage =
    (url.pathname === docsRoute || url.pathname.startsWith(`${docsRoute}/`)) &&
    !url.pathname.endsWith(".md");

  if (!isDocsPage) return next();

  if (isMarkdownPreferred(request)) {
    const slugs = url.pathname.slice(docsRoute.length).split("/").filter(Boolean);
    url.pathname = getPageMarkdownUrl({ slugs }).url;
    throw redirect({ href: url.href, headers: { Vary: "Accept" } });
  }

  const result = await next();
  result.response.headers.append("Vary", "Accept");
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [llmMiddleware],
}));
