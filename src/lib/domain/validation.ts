import {
  APP_TIMEZONE,
  MAX_PLAN_ITEMS,
  type ActivationIssue,
  type CompatibilityWarning,
  type Confirmation,
  type InvitationOptions,
  type InvitationSlot,
  type InvitationStatus,
  type TimeTag,
} from "./model";

export function normalizeEmail(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized) && normalized.length <= 254;
}

export function isValidSlug(value: string): boolean {
  return value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}

export function isValidMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      [
        "google.com",
        "www.google.com",
        "maps.google.com",
        "maps.app.goo.gl",
        "goo.gl",
      ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

export function slotDurationMinutes(slot: InvitationSlot): number {
  return Math.floor((slot.endAt - slot.startAt) / 60_000);
}

export function rangesOverlap(
  left: Pick<InvitationSlot, "startAt" | "endAt">,
  right: Pick<InvitationSlot, "startAt" | "endAt">,
): boolean {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

export function activeSlotTag(slot: InvitationSlot): TimeTag | null {
  const normalized = slot.label.trim().toLocaleLowerCase("en-US");
  if (normalized.includes("morning") || normalized.includes("sáng")) {
    return "morning";
  }
  if (normalized.includes("afternoon") || normalized.includes("chiều")) {
    return "afternoon";
  }
  if (normalized.includes("late") || normalized.includes("khuya")) {
    return "late";
  }
  if (normalized.includes("night") || normalized.includes("tối")) {
    return "night";
  }
  return null;
}

export function getCompatibilityWarnings(
  options: InvitationOptions,
): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = [];

  for (const slot of options.slots) {
    const slotTag = activeSlotTag(slot);
    for (const activity of options.activities) {
      if (
        activity.durationMinutes !== undefined &&
        slotDurationMinutes(slot) < activity.durationMinutes
      ) {
        warnings.push({
          key: `duration:${slot.id}:${activity.id}`,
          slotId: slot.id,
          activityId: activity.id,
          reason: "duration",
          message: `${activity.label} is longer than ${slot.label}.`,
        });
      }

      if (
        slotTag &&
        activity.timeTags.length > 0 &&
        !activity.timeTags.includes(slotTag)
      ) {
        warnings.push({
          key: `activity-time:${slot.id}:${activity.id}`,
          slotId: slot.id,
          activityId: activity.id,
          reason: "activity-time",
          message: `${activity.label} is not tagged for ${slot.label}.`,
        });
      }

      for (const place of activity.places) {
        if (slotTag && place.timeTags.length > 0 && !place.timeTags.includes(slotTag)) {
          warnings.push({
            key: `place-time:${slot.id}:${activity.id}:${place.id}`,
            slotId: slot.id,
            activityId: activity.id,
            placeId: place.id,
            reason: "place-time",
            message: `${place.name} is not tagged for ${slot.label}.`,
          });
        }
      }
    }
  }

  return warnings;
}

export function validateActivation(
  options: InvitationOptions,
  now = Date.now(),
): ActivationIssue[] {
  const issues: ActivationIssue[] = [];

  if (options.recipientName.trim().length === 0) {
    issues.push({
      code: "recipient-name",
      path: "recipient",
      message: "Add the recipient display name.",
    });
  }

  if (!isValidSlug(options.slug)) {
    issues.push({
      code: "slug",
      path: "recipient",
      message: "Use lowercase letters, numbers, and single hyphens in the slug.",
    });
  }

  if (options.timezone !== APP_TIMEZONE) {
    issues.push({
      code: "timezone",
      path: "time",
      message: `MVP invitations must use ${APP_TIMEZONE}.`,
    });
  }

  const futureSlots = options.slots.filter(
    (slot) => slot.startAt > now && slot.endAt > slot.startAt,
  );
  if (futureSlots.length === 0) {
    issues.push({
      code: "future-slot",
      path: "time",
      message: "Add at least one future slot with a valid end time.",
    });
  }

  if (new Set(options.slots.map((slot) => slot.id)).size !== options.slots.length) {
    issues.push({
      code: "slot-id",
      path: "time",
      message: "Each offered slot must have a unique identifier.",
    });
  }

  if (options.activities.length === 0) {
    issues.push({
      code: "activity",
      path: "plan",
      message: "Enable at least one activity.",
    });
  }

  for (const activity of options.activities) {
    if (activity.places.length === 0) {
      issues.push({
        code: `place:${activity.id}`,
        path: "plan",
        message: `Enable at least one place for ${activity.label}.`,
      });
    }
    for (const place of activity.places) {
      if (!isValidMapsUrl(place.mapsUrl)) {
        issues.push({
          code: `maps:${place.id}`,
          path: "plan",
          message: `Add a valid Google Maps URL for ${place.name}.`,
        });
      }
    }
  }

  if (options.colorModule.enabled && options.colorModule.presets.length === 0) {
    issues.push({
      code: "colors",
      path: "extras",
      message: "Enable at least one outfit color or turn the module off.",
    });
  }

  const unacknowledged = getCompatibilityWarnings(options).filter(
    (warning) => !options.acknowledgedOverrides.includes(warning.key),
  );
  if (unacknowledged.length > 0) {
    issues.push({
      code: "compatibility",
      path: "review",
      message: `Review ${unacknowledged.length} compatibility warning${
        unacknowledged.length === 1 ? "" : "s"
      }.`,
    });
  }

  return issues;
}

export function canArchiveInvitation(
  status: InvitationStatus,
  confirmation: Confirmation | undefined,
  now = Date.now(),
): boolean {
  if (["draft", "expired", "cancelled"].includes(status)) {
    return true;
  }
  return status === "confirmed" && confirmation !== undefined && confirmation.slot.endAt <= now;
}

export function validatePlanItems(confirmation: Confirmation): boolean {
  return (
    confirmation.planItems.length > 0 &&
    confirmation.planItems.length <= MAX_PLAN_ITEMS &&
    confirmation.planItems.every((item, index) => item.order === index)
  );
}
