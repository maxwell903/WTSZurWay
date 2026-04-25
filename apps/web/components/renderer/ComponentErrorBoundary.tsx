"use client";

import { Component, type ReactNode } from "react";

type Props = {
  id: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

// Class component is required because React's error-boundary contract uses
// the lifecycle hooks `getDerivedStateFromError` and `componentDidCatch`,
// which only exist on class components. The boundary is keyed by component
// id at the call site so changing a node's id remounts a fresh boundary.
export class ComponentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // Intentional dev-time surface: the error is also rendered as the "click
    // to remove" alert below; logging keeps it visible in DevTools console
    // for the user to copy/share.
    console.error(`[ComponentErrorBoundary] ${this.props.id}:`, error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <div role="alert">Component error — click to remove</div>;
    }
    return this.props.children;
  }
}
