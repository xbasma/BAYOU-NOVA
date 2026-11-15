"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { useStore } from "@/lib/store";

/** Bottom tab bar for small screens. The desktop tabs live in NavBar. */
export default function MobileNav() {
  const { activeId } = useStore();
  const pathname = usePathname();
  if (!activeId) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="void-surface fixed inset-x-0 bottom-0 z-40 border-t border-champagne/20 md:hidden"
    >
      <ul className="grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-ember" : "text-champagne/65"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
