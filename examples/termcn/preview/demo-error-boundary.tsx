/** Catch a demo's render errors and show them in the preview panel. */

import { useTheme } from "@tooee/themes";
import { Component } from "react";
import type { ReactNode } from "react";

export interface DemoFailureProps {
  demo: string;
  message: string;
}

export const DemoFailure = function DemoFailure({ demo, message }: DemoFailureProps): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text content={`Demo ${demo} failed to render.`} fg={theme.error} />
      <text content={message} fg={theme.textMuted} />
    </box>
  );
};

interface DemoErrorBoundaryProps {
  demo: string;
  children?: ReactNode;
}

interface DemoErrorBoundaryState {
  message: string | null;
}

export class DemoErrorBoundary extends Component<DemoErrorBoundaryProps, DemoErrorBoundaryState> {
  constructor(props: DemoErrorBoundaryProps) {
    super(props);
    this.state = { message: null };
  }

  static getDerivedStateFromError(error: Error): DemoErrorBoundaryState {
    return { message: error.message };
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return <DemoFailure demo={this.props.demo} message={this.state.message} />;
    }

    return this.props.children;
  }
}
