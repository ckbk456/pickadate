import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsPanel } from "@/components/dashboard/settings-panel";

export default function SettingsPage() {
  return (
    <main className="dashboard-page">
      <PageHeader eyebrow="Workspace" title="Settings" description="The details that appear across your invitations." />
      <SettingsPanel />
    </main>
  );
}
