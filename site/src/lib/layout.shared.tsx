import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: "https://github.com/gingerhendrix/tooee",
  links: [{ text: "Changelog", url: "/changelog" }],
  nav: {
    title: <span className="tooee-logotype" role="img" aria-label="tooee" />,
    url: "/docs",
  },
});
