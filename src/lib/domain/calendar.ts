import { APP_TIMEZONE, type Confirmation } from "./model";

type CalendarAudience = {
  audience: "owner" | "recipient";
  ownerName: string;
  recipientName: string;
  invitationUrl: string;
};

function toGoogleUtcDate(value: number): string {
  return new Date(value).toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
}

export function buildGoogleCalendarUrl(
  confirmation: Confirmation,
  context: CalendarAudience,
): string {
  const item = confirmation.planItems[0];
  if (!item) {
    throw new Error("A calendar event requires one plan item.");
  }

  const counterpart =
    context.audience === "owner" ? context.recipientName : context.ownerName;
  const details = [
    `Hoạt động: ${item.activity.label}`,
    `Địa điểm: ${item.place.name}`,
    `Google Maps: ${item.place.mapsUrl}`,
    confirmation.color ? `Màu trang phục: ${confirmation.color.label}` : null,
    confirmation.transport
      ? `Di chuyển: ${transportLabel(confirmation.transport)}`
      : null,
    `Lời mời: ${context.invitationUrl}`,
  ].filter((line): line is string => line !== null);

  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: `Date with ${counterpart}`,
    dates: `${toGoogleUtcDate(confirmation.slot.startAt)}/${toGoogleUtcDate(
      confirmation.slot.endAt,
    )}`,
    ctz: APP_TIMEZONE,
    location: `${item.place.name}, ${item.place.address}`,
    details: details.join("\n"),
  });

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}

export function transportLabel(value: string): string {
  switch (value) {
    case "pickup":
      return "Đón mình nhé";
    case "meet-there":
      return "Mình tự đến";
    default:
      return "Mình bàn sau nhé";
  }
}
