import { useQuitCommand } from "@tooee/shell";

interface ViewStateProps {
  message: string;
  color?: string;
}

/** A non-document view state that preserves the viewer's normal quit command. */
export const ViewState = function ViewState({ message, color }: ViewStateProps): React.ReactNode {
  useQuitCommand();

  return (
    <box style={{ flexDirection: "column" }}>
      <text content={message} fg={color} />
    </box>
  );
};
