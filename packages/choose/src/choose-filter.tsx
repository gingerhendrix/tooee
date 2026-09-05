import type { ReactNode } from "react";
import { CloseButton, decodeReactContent } from "@tooee/layout";
import { useTheme } from "@tooee/themes";
import type { UseChooseResult } from "./use-choose.js";

export interface ChooseFilterProps {
  choose: UseChooseResult;
  prompt?: ReactNode;
  placeholder?: string;
  right?: ReactNode;
  onClose?: () => void;
}

/** Controlled filter row shared by fullscreen and overlay chooser assemblies. */
export const ChooseFilter = function ChooseFilter({
  choose,
  prompt = "> ",
  placeholder = "Filter...",
  right,
  onClose,
}: ChooseFilterProps): ReactNode {
  const { theme } = useTheme();
  const { state, view } = choose;
  const handleFilterInput = view.onFilterInput;
  const handleFilterKeyDown = view.onFilterKeyDown;
  const promptContent = decodeReactContent(prompt);
  let renderedPrompt: ReactNode = null;
  if (promptContent.kind === "string") {
    renderedPrompt = <text content={promptContent.value} fg={theme.accent} />;
  } else if (promptContent.kind === "node") {
    renderedPrompt = promptContent.value;
  }

  return (
    <box flexDirection="row" height={1} style={{ paddingLeft: 1, paddingRight: 1 }}>
      {renderedPrompt}
      <input
        ref={view.filterRef}
        focused={view.filterFocused}
        value={state.filterQuery}
        placeholder={placeholder}
        onInput={handleFilterInput}
        onKeyDown={handleFilterKeyDown}
        backgroundColor="transparent"
        textColor={theme.text}
        placeholderColor={theme.textMuted}
        cursorColor={theme.primary}
        style={{ flexGrow: 1 }}
      />
      <text content={` ${state.matches.length}/${state.items.length}`} fg={theme.textMuted} />
      {right}
      {onClose && <CloseButton onClose={onClose} />}
    </box>
  );
};
