export default function EditLoading() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="flex h-14 items-center gap-4 border-b border-zinc-800 px-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-6 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r border-zinc-800 p-4">
          <div className="h-8 w-full animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="flex-1 p-8">
          <div className="mx-auto h-full w-full max-w-[1280px] animate-pulse rounded bg-zinc-900" />
        </div>
        <div className="w-80 border-l border-zinc-800 p-4">
          <div className="h-8 w-full animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
