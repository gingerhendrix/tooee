import { githubReleases, type GitHubReleases } from "@fumadocs/changelog/github";

type CachedReleases = Omit<GitHubReleases, "entries"> & {
  entries: (Omit<GitHubReleases["entries"][number], "date"> & { date: string })[];
};

export async function getGitHubReleases(page: number): Promise<GitHubReleases> {
  // Plain Vite dev/preview has no Workers Cache API.
  const cache = (globalThis as typeof globalThis & { caches?: CacheStorage & { default?: Cache } })
    .caches?.default;
  const key = new Request(`https://tooee.dev/__cache/github-releases?page=${page}`);

  try {
    const cached = await cache?.match(key);
    if (cached) {
      const releases: CachedReleases = await cached.json();
      return {
        ...releases,
        entries: releases.entries.map((entry) => ({ ...entry, date: new Date(entry.date) })),
      };
    }
  } catch {
    // A cache failure should still allow a fresh GitHub request.
  }

  const releases = await githubReleases({
    owner: "gingerhendrix",
    repo: "tooee",
    token: typeof process === "undefined" ? undefined : process.env.GITHUB_TOKEN,
    page,
  });

  try {
    await cache?.put(
      key,
      Response.json(releases, { headers: { "Cache-Control": "public, max-age=3600" } })
    );
  } catch {
    // Keep freshly fetched releases available even if the cache cannot be written.
  }

  return releases;
}
