import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: "https://github.com/gingerhendrix/tooee",
  nav: {
    title: <span className="tooee-logotype" role="img" aria-label="tooee" />,
    url: "/docs",
  },
});
