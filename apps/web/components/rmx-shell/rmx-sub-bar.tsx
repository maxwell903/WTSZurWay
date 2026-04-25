import { HelpCircle } from "lucide-react";

// Cyan band color: Tailwind core `bg-sky-500`. Picked over `bg-cyan-500` to
// match the slightly bluer cyan in image_2.png; revisit if the user wants a
// closer match (in which case define a `--rmx-sub-bar` HSL var in globals.css).
export function RmxSubBar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between bg-sky-500 px-6 py-3 text-white">
      <h1 className="text-lg font-bold">{title}</h1>
      <button
        type="button"
        aria-label="Help"
        className="grid h-7 w-7 place-items-center rounded-full text-white/90 hover:bg-white/15"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
