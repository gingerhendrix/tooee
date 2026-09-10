/* oxlint-disable no-use-before-define -- the screen closes over the route initialized before router startup */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useChooseDialog } from "@tooee/choose";
import { useCommand } from "@tooee/commands";
import type { CommandContext } from "@tooee/commands";
import {
  createRoute,
  createRouter,
  useNavigate,
  useParams,
  useRouter,
  useRouterCommands,
} from "@tooee/router";
import type { Codec, RouteDefinition, RouterInstance } from "@tooee/router";
import path from "node:path";
import { createFileProvider } from "./default-provider.js";
import { runLinkHandlers } from "./link-handlers.js";
import { markdownLinks } from "./markdown-links.js";
import type { MarkdownLink } from "./markdown-links.js";
import { getTextContent } from "./types.js";
import type { ViewLaunchOptions } from "./launch.js";
import { View } from "./view.js";

const documentParams: Codec<{ path?: string }> = {
  parse: (value) => {
    /* oxlint-disable anti-slop/no-runtime-typeof -- route params are decoded at this boundary */
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new TypeError("Expected document params");
    }
    if (!("path" in value) || value.path === undefined) {
      return {};
    }
    if (typeof value.path !== "string" || !path.isAbsolute(value.path)) {
      throw new TypeError("Expected an absolute document path");
    }
    /* oxlint-enable anti-slop/no-runtime-typeof */
    return { path: value.path };
  },
};

interface StandaloneRouter {
  documentRoute: RouteDefinition<{ path?: string }>;
  router: RouterInstance;
}

export const createStandaloneRouter = function createStandaloneRouter(
  options: ViewLaunchOptions,
): StandaloneRouter {
  const DocumentScreen = function DocumentScreen(): ReactNode {
    useRouterCommands();
    const { path: documentPath } = useParams(documentRoute);
    const navigate = useNavigate();
    const { stack } = useRouter();
    const chooseLink = useChooseDialog<MarkdownLink>();
    const provider = useMemo(
      () =>
        documentPath === undefined ? options.contentProvider : createFileProvider(documentPath),
      [documentPath],
    );
    const activate = (href: string, command: CommandContext): boolean => {
      if (options.filePath === undefined) {
        command.toast?.toast({ level: "info", message: "Links need a source file" });
        return true;
      }
      const currentPath = path.resolve(documentPath ?? options.filePath);
      return runLinkHandlers(
        options.linkHandlers ?? [],
        { baseDir: path.dirname(currentPath), currentPath, href },
        { command, documentRoute, navigate },
      );
    };
    useCommand({
      handler: async (context) => {
        // Source positions are zero-based, unlike the displayed line numbers.
        const line = context.document?.activeAnchor?.source?.primary?.start.line;
        const content = context.view?.content;
        if (line === undefined || content === undefined) {
          return;
        }
        const links = markdownLinks(getTextContent(content).split("\n")[line] ?? "");
        // One link follows directly; several open a chooser so none is silently preferred.
        const link =
          links.length > 1
            ? await chooseLink.open({
                items: links,
                prompt: "Follow link",
                toItem: (item) => ({ description: item.href, text: item.text }),
              })
            : (links[0] ?? null);
        if (link !== null) {
          activate(link.href, context);
        }
      },
      hotkey: "enter",
      id: "view.follow-link",
      modes: ["cursor"],
      title: "Follow Markdown link",
      when: (context) => context.view?.format === "markdown",
    });
    return (
      <View
        key={`${stack.length}:${documentPath ?? ""}`}
        actions={options.actions}
        codeBlockRenderers={options.codeBlockRenderers}
        contentProvider={provider}
        onMarkdownLinkActivate={activate}
        renderers={options.renderers}
      />
    );
  };
  const documentRoute = createRoute({
    component: DocumentScreen,
    id: "view.document",
    params: documentParams,
  });
  const router = createRouter({
    initial: { routeId: documentRoute.id },
    routes: [documentRoute],
  });
  return { documentRoute, router };
};
