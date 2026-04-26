import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EditNotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Site not found</h1>
        <p className="text-sm text-zinc-400">
          We couldn&apos;t find a working version for this site. Generate one from the setup form, or
          double-check the URL slug.
        </p>
        <Button asChild>
          <Link href="/setup">Go to setup</Link>
        </Button>
      </div>
    </div>
  );
}
