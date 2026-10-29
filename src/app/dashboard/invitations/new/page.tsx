import Link from "next/link";
import { NewInvitation } from "@/components/dashboard/new-invitation";
import { PageHeader } from "@/components/dashboard/page-header";

export default function NewInvitationPage() {
  return (
    <main className="dashboard-page">
      <PageHeader eyebrow="New invitation" title="Start with a curated draft" description="No private link exists until the invitation passes readiness checks and you activate it." action={<Link className="button button-secondary" href="/dashboard">Cancel</Link>} />
      <NewInvitation />
    </main>
  );
}
