"use client";

import { useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { RecipientFlow, RecipientUnavailable } from "@/components/recipient/recipient-flow";
import type { PublicActiveInvitation } from "@/components/recipient/types";

export function InvitationPreview({ id }: { id: Id<"invitations"> }) {
  const [previewStart] = useState(() => Date.now() + 7 * 24 * 60 * 60_000);
  const invitation = useQuery(api.invitations.get, { id });
  const settings = useQuery(api.owner.getSettings);
  if (!invitation || settings === undefined) return <main className="recipient-loading" lang="vi"><span className="loading-orbit" /><p>Đang dựng bản xem trước…</p></main>;
  if (invitation.confirmation) return <RecipientUnavailable kind="ended" />;

  const options = invitation.options.slots.length > 0 ? invitation.options : {
    ...invitation.options,
    slots: [{ id: "preview-slot", label: "Tối", startAt: previewStart, endAt: previewStart + 3 * 60 * 60_000 }],
  };
  const preview: PublicActiveInvitation = {
    kind: "active",
    revision: invitation.revision,
    linkGeneration: invitation.linkGeneration,
    ownerName: settings?.displayName ?? "Khang",
    options,
  };
  return <div className="preview-only"><div className="preview-banner">Protected preview · no action is sent</div><RecipientFlow token={`preview-${id}`} invitation={preview} onConfirm={async () => { throw new Error("Đây chỉ là bản xem trước. Không có xác nhận nào được gửi."); }} /></div>;
}
