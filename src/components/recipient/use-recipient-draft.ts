"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicActiveInvitation, RecipientDraft } from "./types";

function createDraft(): RecipientDraft {
  return {
    step: 0,
    email: "",
    confirmationKey: crypto.randomUUID(),
  };
}

function isDraft(value: unknown): value is RecipientDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<RecipientDraft>;
  return typeof draft.step === "number" && typeof draft.email === "string" && typeof draft.confirmationKey === "string";
}

export function useRecipientDraft(token: string, invitation: PublicActiveInvitation) {
  const storageKey = useMemo(() => `pick-a-date:draft:${token}:g${invitation.linkGeneration}`, [token, invitation.linkGeneration]);
  const [draft, setDraft] = useState<RecipientDraft>(() => createDraft());
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [reconciliationNotice, setReconciliationNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      let next = createDraft();
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isDraft(parsed)) next = parsed;
        }
      } catch {
        // A disabled or corrupt localStorage should never prevent the invitation.
      }
      setDraft(next);
      setHydratedKey(storageKey);
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Persistence is a convenience; confirmation remains fully usable without it.
    }
  }, [draft, hydratedKey, storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    const slotValid = !draft.slotId || invitation.options.slots.some((slot) => slot.id === draft.slotId);
    const activity = invitation.options.activities.find((item) => item.id === draft.activityId);
    const activityValid = !draft.activityId || Boolean(activity);
    const placeValid = !draft.placeId || Boolean(activity?.places.some((place) => place.id === draft.placeId));
    const colorValid = !draft.colorId || invitation.options.colorModule.presets.some((color) => color.id === draft.colorId);

    if (slotValid && activityValid && placeValid && colorValid) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDraft((current) => ({
        ...current,
        slotId: slotValid ? current.slotId : undefined,
        activityId: activityValid ? current.activityId : undefined,
        placeId: activityValid && placeValid ? current.placeId : undefined,
        colorId: colorValid ? current.colorId : undefined,
        step: Math.min(current.step, !slotValid ? 1 : !activityValid ? 2 : !placeValid ? 3 : 4),
      }));
      setReconciliationNotice("Lời mời vừa được cập nhật. Mình đã giữ lại các lựa chọn còn hợp lệ và bỏ lựa chọn không còn có sẵn.");
    });
    return () => { cancelled = true; };
  }, [draft.activityId, draft.colorId, draft.placeId, draft.slotId, hydratedKey, invitation.options, storageKey]);

  return { draft, setDraft, reconciliationNotice, clearNotice: () => setReconciliationNotice(null) };
}
