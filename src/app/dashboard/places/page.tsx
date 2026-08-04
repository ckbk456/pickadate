import { PageHeader } from "@/components/dashboard/page-header";
import { PlacesManager } from "@/components/dashboard/places-manager";

export default function PlacesPage() {
  return (
    <main className="dashboard-page">
      <PageHeader eyebrow="Catalog" title="Places" description="Owner-curated details, photography, activity associations, and Maps links." />
      <PlacesManager />
    </main>
  );
}
