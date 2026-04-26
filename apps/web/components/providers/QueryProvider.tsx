"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

// One QueryClient per browser session. The React 19 useState idiom keeps the
// client alive across re-renders without leaking it across hot-reloads in dev.
// Sprint 9: mock-RM data does not change between fetches, so a long staleTime
// is correct. refetchOnWindowFocus is off because the editor canvas would
// otherwise refetch every time the user clicked back from devtools.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
