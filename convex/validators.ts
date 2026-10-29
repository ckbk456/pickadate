import { v } from "convex/values";

export const timeTag = v.union(
  v.literal("morning"),
  v.literal("afternoon"),
  v.literal("night"),
  v.literal("late"),
);

export const invitationStatus = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("confirmed"),
  v.literal("expired"),
  v.literal("cancelled"),
);

export const transportOption = v.union(
  v.literal("pickup"),
  v.literal("meet-there"),
  v.literal("decide-later"),
);

export const colorPreset = v.object({
  id: v.string(),
  label: v.string(),
  hex: v.string(),
});

export const invitationSlot = v.object({
  id: v.string(),
  label: v.string(),
  startAt: v.number(),
  endAt: v.number(),
});

export const placeSnapshot = v.object({
  id: v.string(),
  catalogPlaceId: v.optional(v.string()),
  name: v.string(),
  address: v.string(),
  mapsUrl: v.string(),
  note: v.optional(v.string()),
  timeTags: v.array(timeTag),
  coverImageUrl: v.string(),
  galleryImageUrls: v.array(v.string()),
});

export const activitySnapshot = v.object({
  id: v.string(),
  catalogActivityId: v.optional(v.string()),
  label: v.string(),
  description: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  timeTags: v.array(timeTag),
  places: v.array(placeSnapshot),
});

export const invitationOptions = v.object({
  recipientName: v.string(),
  slug: v.string(),
  message: v.optional(v.string()),
  timezone: v.literal("Asia/Ho_Chi_Minh"),
  slots: v.array(invitationSlot),
  activities: v.array(activitySnapshot),
  colorModule: v.object({
    enabled: v.boolean(),
    presets: v.array(colorPreset),
  }),
  transportEnabled: v.boolean(),
  acknowledgedOverrides: v.array(v.string()),
});

export const planItem = v.object({
  order: v.number(),
  activity: v.object({
    id: v.string(),
    catalogActivityId: v.optional(v.string()),
    label: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    timeTags: v.array(timeTag),
  }),
  place: placeSnapshot,
});

export const confirmation = v.object({
  slot: invitationSlot,
  planItems: v.array(planItem),
  color: v.optional(colorPreset),
  transport: v.optional(transportOption),
  recipientEmail: v.optional(v.string()),
  confirmationKey: v.string(),
  confirmedAt: v.number(),
});
