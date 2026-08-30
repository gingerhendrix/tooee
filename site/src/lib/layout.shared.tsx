import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: "https://github.com/gingerhendrix/tooee",
  nav: {
    title: (
      <span className="font-logotype text-[60pt] font-medium leading-none tracking-wide normal-case">
        tooee
      </span>
    ),
    url: "/docs",
  },
});
