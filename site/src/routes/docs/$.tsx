import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { Suspense } from "react";

import { getMDXComponents } from "#/components/mdx";
import { baseOptions } from "#/lib/layout.shared";
import { getPageMarkdownUrl } from "#/lib/shared";
import { source } from "#/lib/source";

const throwNotFound = (): never => {
  notFound({ throw: true });
  throw new Error("TanStack Router did not throw its not-found control flow");
};

const serverLoader = createServerFn({
  method: "GET",
})
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) {
      return throwNotFound();
    }

    return {
      pageTree: await source.serializePageTree(source.getPageTree()),
      path: page.path,
      markdownUrl: getPageMarkdownUrl(page).url,
    };
  });

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDXContent },
    { markdownUrl, path }: { markdownUrl: string; path: string }
  ) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/gingerhendrix/tooee/blob/main/site/content/docs/${encodeURI(path)}`}
          />
        </div>
        <DocsBody>
          <MDXContent components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

const routeApi = getRouteApi("/docs/$");

const Page = () => {
  const data = useFumadocsLoader(routeApi.useLoaderData());

  return (
    <DocsLayout {...baseOptions()} tree={data.pageTree}>
      <Suspense>{clientLoader.useContent(data.path, data)}</Suspense>
    </DocsLayout>
  );
};

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await serverLoader({ data: slugs });
    await clientLoader.preload(data.path);
    return data;
  },
});
