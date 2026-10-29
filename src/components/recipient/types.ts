import type {
  ColorPreset,
  Confirmation,
  InvitationOptions,
  TransportOption,
} from "@/lib/domain/model";

export type PublicActiveInvitation = {
  kind: "active";
  revision: number;
  linkGeneration: number;
  ownerName: string;
  options: InvitationOptions;
};

export type PublicFinalInvitation = {
  kind: "confirmed" | "cancelled-confirmed";
  ownerName: string;
  recipientName: string;
  confirmation: Confirmation;
};

export type PublicInvitation =
  | PublicActiveInvitation
  | PublicFinalInvitation
  | { kind: "ended" }
  | { kind: "unavailable" };

export type RecipientSelection = {
  revision: number;
  slotId: string;
  activityId: string;
  placeId: string;
  colorId?: string;
  transport?: TransportOption;
  recipientEmail?: string;
  confirmationKey: string;
};

export type RecipientDraft = {
  step: number;
  slotId?: string;
  activityId?: string;
  placeId?: string;
  colorId?: string;
  transport?: TransportOption;
  email: string;
  confirmationKey: string;
};

export type PublicColor = ColorPreset;
