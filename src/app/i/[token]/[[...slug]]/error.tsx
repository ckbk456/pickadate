"use client";

import { RecipientUnavailable } from "@/components/recipient/recipient-flow";

export default function InvitationError() {
  return <RecipientUnavailable kind="unavailable" />;
}
