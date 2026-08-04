"use client";

import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useSyncExternalStore } from "react";
import { api } from "@convex/_generated/api";
import { RecipientFinalCard, RecipientFlow, RecipientUnavailable } from "./recipient-flow";
import type { PublicActiveInvitation, PublicFinalInvitation, RecipientSelection } from "./types";

export function RecipientRoute({ token }: { token: string }) {
  const result = useQuery(api.invitations.getPublic, { token });
  const confirmInvitation = useMutation(api.invitations.confirm);
  const connection = useConvexConnectionState();
  const currentUrl = useSyncExternalStore(
    () => () => undefined,
    () => window.location.href,
    () => "",
  );

  if (result === undefined) {
    return <main className="recipient-loading" lang="vi"><span className="loading-orbit" /><p>Đang mở lời mời…</p></main>;
  }

  if (result.state === "unavailable") return <RecipientUnavailable kind="unavailable" />;
  if (result.state === "ended") return <RecipientUnavailable kind="ended" />;

  if (result.state === "confirmed" || result.state === "cancelled") {
    const invitation: PublicFinalInvitation = {
      kind: result.state === "cancelled" ? "cancelled-confirmed" : "confirmed",
      ownerName: result.ownerName,
      recipientName: result.recipientName,
      confirmation: result.confirmation,
    };
    return <ConnectionFrame disconnected={connection.hasEverConnected && !connection.isWebSocketConnected}><RecipientFinalCard invitation={invitation} invitationUrl={currentUrl} /></ConnectionFrame>;
  }

  const invitation: PublicActiveInvitation = {
    kind: "active",
    revision: result.revision,
    linkGeneration: result.linkGeneration,
    ownerName: result.ownerName,
    options: {
      recipientName: result.recipientName,
      slug: "",
      message: result.message,
      timezone: result.timezone,
      slots: result.slots!,
      activities: result.activities!,
      colorModule: result.colorModule!,
      transportEnabled: result.transportEnabled!,
      acknowledgedOverrides: [],
    },
  };

  async function handleConfirm(selection: RecipientSelection) {
    const outcome = await confirmInvitation({
      token,
      expectedLinkGeneration: invitation.linkGeneration,
      expectedRevision: selection.revision,
      slotId: selection.slotId,
      activityId: selection.activityId,
      placeId: selection.placeId,
      colorId: selection.colorId,
      transport: selection.transport,
      recipientEmail: selection.recipientEmail,
      confirmationKey: selection.confirmationKey,
    });

    switch (outcome.outcome) {
      case "confirmed":
      case "already-confirmed":
        return;
      case "stale":
        throw new Error("Lời mời vừa được cập nhật. Hãy kiểm tra lại lựa chọn trước khi xác nhận.");
      case "slot-conflict":
        throw new Error("Khung giờ này vừa được chốt ở một lời mời khác. Hãy chọn lại nếu còn giờ phù hợp.");
      case "expired":
        throw new Error("Khung giờ này đã qua. Các lựa chọn còn lại sẽ tự cập nhật.");
      case "invalid-selection":
        throw new Error("Một lựa chọn không còn có sẵn. Trang sẽ giữ lại phần còn hợp lệ.");
      default:
        throw new Error("Lời mời không còn có thể xác nhận. Hãy liên hệ trực tiếp với người gửi.");
    }
  }

  return <ConnectionFrame disconnected={connection.hasEverConnected && !connection.isWebSocketConnected}><RecipientFlow token={token} invitation={invitation} onConfirm={handleConfirm} /></ConnectionFrame>;
}

function ConnectionFrame({ disconnected, children }: { disconnected: boolean; children: React.ReactNode }) {
  return <>{disconnected ? <div className="connection-banner" role="status">Đang kết nối lại. Các lựa chọn trên thiết bị này vẫn được giữ nguyên.</div> : null}{children}</>;
}
