import type { Id } from "@convex/_generated/dataModel";
import { InvitationDetail } from "@/components/dashboard/invitation-detail";

export default async function InvitationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvitationDetail id={id as Id<"invitations">} />;
}
