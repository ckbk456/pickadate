import type { Metadata } from "next";
import type { Id } from "@convex/_generated/dataModel";
import { OwnerGate } from "@/components/dashboard/owner-gate";
import { InvitationPreview } from "@/components/dashboard/invitation-preview";

export const metadata: Metadata = { title: "Protected invitation preview", robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerGate><InvitationPreview id={id as Id<"invitations">} /></OwnerGate>;
}
