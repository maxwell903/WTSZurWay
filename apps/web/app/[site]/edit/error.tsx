"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

type EditorErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EditorError({ error, reset }: EditorErrorProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="max-w-md space-y-4 rounded-lg border border-zinc-800 p-6">
        <h1 className="text-xl font-semibold">Editor failed to load</h1>
        <p className="text-sm text-zinc-400">{error.message || "Something went wrong."}</p>
        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/setup">Go back</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
