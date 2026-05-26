import { Link, useLocation } from "@tanstack/react-router";
import { PawPrint, Heart, Store, MessageCircle, User } from "lucide-react";

const tabs = [
  { to: "/app/swipe", label: "Swipe", Icon: PawPrint },
  { to: "/app/adopt", label: "Adopt", Icon: Heart },
  { to: "/app/shop", label: "Shop", Icon: Store },
  { to: "/app/matches", label: "Matches", Icon: MessageCircle },
  { to: "/app/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ to, label, Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "fill-primary/20" : ""}`} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
