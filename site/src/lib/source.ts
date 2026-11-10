import { docs } from "collections/server";
import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";

export const source = loader({
  baseUrl: "/docs",
  plugins: [lucideIconsPlugin()],
  source: docs.toFumadocsSource(),
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
