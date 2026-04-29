import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-950 px-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-10 py-12 shadow-xl">
        <h1 className="text-4xl font-bold tracking-tight text-white">Nebula</h1>
        <p className="text-base text-neutral-400">Generative websites for Rent Manager.</p>
        <Link
          href="/setup"
          className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-sky-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Open Setup
        </Link>
      </div>
    </main>
  );
}
