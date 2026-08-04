import { ActivitiesManager } from "@/components/dashboard/activities-manager";
import { PageHeader } from "@/components/dashboard/page-header";

export default function ActivitiesPage() {
  return (
    <main className="dashboard-page">
      <PageHeader eyebrow="Catalog" title="Activities" description="Keep the choice small, personal, and reusable across invitations." />
      <ActivitiesManager />
    </main>
  );
}
