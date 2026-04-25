import { CommandLaunchPalette } from "@/components/rmx-shell/command-launch-palette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Home, List, Menu, Star } from "lucide-react";

const LEFT_ICONS = [
  { icon: Home, label: "Home" },
  { icon: Menu, label: "Open menu" },
  { icon: List, label: "List view" },
  { icon: Star, label: "Favorites" },
] as const;

export function RmxTopBar() {
  return (
    <header className="flex items-center gap-4 border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-neutral-200">
      <div className="flex items-center gap-1">
        {LEFT_ICONS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="grid h-9 w-9 place-items-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="flex flex-1 justify-center">
        <CommandLaunchPalette />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right text-[11px] leading-tight uppercase tracking-wide text-neutral-400 sm:block">
          <div>Company Code</div>
          <div className="text-neutral-200 normal-case tracking-normal">my-company</div>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
        >
          <Bell className="h-5 w-5" />
          <span
            aria-label="2 unread notifications"
            className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-semibold text-white"
          >
            2
          </span>
        </button>

        {/* "WC" is the only place "WebCraft" is acknowledged per PROJECT_SPEC.md §1.5. */}
        <Avatar className="h-9 w-9 bg-neutral-700">
          <AvatarFallback className="bg-neutral-700 text-sm font-semibold text-white">
            WC
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
