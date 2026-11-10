import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { ChangelogPagination, ChangelogTimeline } from "#/components/changelog";
import { baseOptions } from "#/lib/layout.shared";
import { getGitHubReleases } from "#/lib/releases.server";

const getReleases = createServerFn({ method: "GET" })
  .inputValidator((page: number) => {
    if (!Number.isSafeInteger(page) || page < 1) throw notFound();
    return page;
  })
  .handler(async ({ data: page }) => {
    try {
      return { releases: await getGitHubReleases(page) };
    } catch {
      return { releases: undefined };
    }
  });

export const Route = createFileRoute("/changelog/{-$page}")({
  head: () => ({ meta: [{ title: "Changelog | Tooee" }] }),
  loader: async ({ params }) => {
    if (params.page && !/^\d+$/.test(params.page)) throw notFound();
    const page = Number(params.page ?? 1);
    const result = await getReleases({ data: page });
    if (result.releases?.entries.length === 0 && page > 1) throw notFound();
    return { page, ...result };
  },
  component: Page,
});

function Page() {
  const { page, releases } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-10 px-4 py-12">
        <h1 className="text-3xl font-bold">Changelog</h1>
        {releases ? (
          <>
            {releases.entries.length > 0 ? (
              <ChangelogTimeline entries={releases.entries} />
            ) : (
              <p>No releases published yet.</p>
            )}
            <ChangelogPagination
              newer={page > 1 ? (page === 2 ? "/changelog" : `/changelog/${page - 1}`) : undefined}
              older={releases.nextPage ? `/changelog/${releases.nextPage}` : undefined}
            />
          </>
        ) : (
          <p>
            Releases are temporarily unavailable. See the{" "}
            <a className="underline" href="https://github.com/gingerhendrix/tooee/releases">
              GitHub releases
            </a>
            .
          </p>
        )}
      </div>
    </HomeLayout>
  );
}
