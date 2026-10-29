import type { Metadata } from "next";
import { RecipientRoute } from "@/components/recipient/recipient-route";

export const metadata: Metadata = {
  title: "Bạn có một lời mời",
  description: "Mở lời mời riêng của bạn trên Pick-a-Date.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string; slug?: string[] }> }) {
  const { token } = await params;
  return <RecipientRoute token={token} />;
}
