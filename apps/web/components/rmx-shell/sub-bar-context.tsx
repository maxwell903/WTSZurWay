"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

type SubBarContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

const SubBarContext = createContext<SubBarContextValue | null>(null);

export function SubBarProvider({
  children,
  defaultTitle = "",
}: {
  children: ReactNode;
  defaultTitle?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  return <SubBarContext.Provider value={{ title, setTitle }}>{children}</SubBarContext.Provider>;
}

function useSubBarContext(hookName: string): SubBarContextValue {
  const ctx = useContext(SubBarContext);
  if (!ctx) {
    throw new Error(`${hookName} must be used inside <SubBarProvider>`);
  }
  return ctx;
}

export function useSubBarTitleValue(): string {
  return useSubBarContext("useSubBarTitleValue").title;
}

export function useSubBarTitle(title: string): void {
  const ctx = useSubBarContext("useSubBarTitle");
  useEffect(() => {
    ctx.setTitle(title);
  }, [ctx, title]);
}

// Tiny helper so server-component pages can declare their sub-bar title
// without becoming client components themselves. Renders nothing.
export function SetSubBarTitle({ title }: { title: string }) {
  useSubBarTitle(title);
  return null;
}
