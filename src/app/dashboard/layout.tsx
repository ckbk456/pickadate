import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OwnerGate } from "@/components/dashboard/owner-gate";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerGate>
      <DashboardShell>{children}</DashboardShell>
    </OwnerGate>
  );
}
