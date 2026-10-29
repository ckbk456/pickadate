export const APP_TIMEZONE = "Asia/Ho_Chi_Minh" as const;
export const MAX_PLAN_ITEMS = 1 as const;

export const INVITATION_STATUSES = [
  "draft",
  "active",
  "confirmed",
  "expired",
  "cancelled",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const TIME_TAGS = ["morning", "afternoon", "night", "late"] as const;
export type TimeTag = (typeof TIME_TAGS)[number];

export const TRANSPORT_OPTIONS = ["pickup", "meet-there", "decide-later"] as const;
export type TransportOption = (typeof TRANSPORT_OPTIONS)[number];

export type ColorPreset = {
  id: string;
  label: string;
  hex: string;
};

export type InvitationSlot = {
  id: string;
  label: string;
  startAt: number;
  endAt: number;
};

export type PlaceSnapshot = {
  id: string;
  catalogPlaceId?: string;
  name: string;
  address: string;
  mapsUrl: string;
  note?: string;
  timeTags: TimeTag[];
  coverImageUrl: string;
  galleryImageUrls: string[];
};

export type ActivitySnapshot = {
  id: string;
  catalogActivityId?: string;
  label: string;
  description?: string;
  durationMinutes?: number;
  timeTags: TimeTag[];
  places: PlaceSnapshot[];
};

export type InvitationOptions = {
  recipientName: string;
  slug: string;
  message?: string;
  timezone: typeof APP_TIMEZONE;
  slots: InvitationSlot[];
  activities: ActivitySnapshot[];
  colorModule: {
    enabled: boolean;
    presets: ColorPreset[];
  };
  transportEnabled: boolean;
  acknowledgedOverrides: string[];
};

export type PlanItem = {
  order: number;
  activity: Omit<ActivitySnapshot, "places">;
  place: PlaceSnapshot;
};

export type Confirmation = {
  slot: InvitationSlot;
  planItems: PlanItem[];
  color?: ColorPreset;
  transport?: TransportOption;
  recipientEmail?: string;
  confirmedAt: number;
};

export type ActivationIssue = {
  code: string;
  path: string;
  message: string;
};

export type CompatibilityWarning = {
  key: string;
  slotId: string;
  activityId: string;
  placeId?: string;
  reason: "duration" | "activity-time" | "place-time";
  message: string;
};
