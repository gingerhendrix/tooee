import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: "https://github.com/gingerhendrix/tooee",
  nav: {
    title: (
      <span className="font-logotype text-[60pt] leading-none font-medium tracking-wide normal-case">
        tooee
      </span>
    ),
    url: "/docs",
  },
});
