import { Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { InvitationsOverview } from "@/components/dashboard/invitations-overview";
import { PageHeader } from "@/components/dashboard/page-header";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <PageHeader eyebrow="Planning desk" title="Invitations" description="Create the private link, watch the final choice arrive, and keep the plan handy." action={<Link className="button button-primary" href="/dashboard/invitations/new"><Plus weight="bold" /> New invitation</Link>} />
      <InvitationsOverview />
    </main>
  );
}
