"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  CalendarDots,
  GearSix,
  MapPin,
  SignOut,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Invitations", icon: CalendarDots },
  { href: "/dashboard/activities", label: "Activities", icon: SquaresFour },
  { href: "/dashboard/places", label: "Places", icon: MapPin },
  { href: "/dashboard/settings", label: "Settings", icon: GearSix },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="dashboard-brand">
          <Sparkle weight="fill" aria-hidden="true" />
          <span>Pick-a-Date</span>
        </Link>
        <nav aria-label="Dashboard">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard"
              ? pathname === item.href || pathname.startsWith("/dashboard/invitations")
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="dashboard-nav-link" data-active={active || undefined}>
                <Icon weight={active ? "fill" : "regular"} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="dashboard-sidebar-footer">
          <div>
            <strong>Personal workspace</strong>
            <span>Asia/Ho_Chi_Minh</span>
          </div>
          <button className="icon-button" type="button" aria-label="Sign out" onClick={() => void signOut()}>
            <SignOut aria-hidden="true" />
          </button>
        </div>
      </aside>
      <div className="dashboard-main">{children}</div>
    </div>
  );
}
