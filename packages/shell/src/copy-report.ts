import { copyToClipboard } from "@tooee/clipboard";
import type { CommandContext } from "@tooee/commands";

export const COPY_FAILED_MESSAGE = "Copy failed: no clipboard tool found (wl-copy, xclip or xsel)";

/** Copy text, then show a success toast, or an error toast if no clipboard tool took it. */
export const copyAndReport = async function copyAndReport(
  ctx: CommandContext,
  text: string,
  successMessage: string
): Promise<void> {
  const copied = await copyToClipboard(text);

  ctx.toast?.toast(
    copied
      ? { level: "success", message: successMessage }
      : { level: "error", message: COPY_FAILED_MESSAGE }
  );
};
