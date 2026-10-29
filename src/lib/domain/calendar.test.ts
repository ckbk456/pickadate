import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl } from "./calendar";
import type { Confirmation } from "./model";

const confirmation: Confirmation = {
  slot: {
    id: "slot",
    label: "Buổi chiều",
    startAt: Date.UTC(2026, 7, 8, 7, 0, 0),
    endAt: Date.UTC(2026, 7, 8, 10, 0, 0),
  },
  planItems: [
    {
      order: 0,
      activity: {
        id: "badminton",
        label: "Đánh cầu lông",
        durationMinutes: 120,
        timeTags: ["afternoon"],
      },
      place: {
        id: "ky-hoa",
        name: "Sân Kỳ Hòa & bạn",
        address: "Quận 10, TP.HCM",
        mapsUrl: "https://maps.google.com/?q=Kỳ+Hòa&entry=ttu",
        timeTags: ["afternoon"],
        coverImageUrl: "/ky-hoa.jpg",
        galleryImageUrls: [],
      },
    },
  ],
  color: { id: "sage", label: "Xanh lá", hex: "#829173" },
  transport: "pickup",
  confirmedAt: Date.UTC(2026, 7, 5),
};

describe("Google Calendar template", () => {
  it("builds an editable recipient event with encoded Vietnamese content", () => {
    const value = buildGoogleCalendarUrl(confirmation, {
      audience: "recipient",
      ownerName: "Khang",
      recipientName: "Linh",
      invitationUrl: "https://example.com/i/private-token/linh",
    });
    const url = new URL(value);

    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Date with Khang");
    expect(url.searchParams.get("dates")).toBe("20260808T070000Z/20260808T100000Z");
    expect(url.searchParams.get("ctz")).toBe("Asia/Ho_Chi_Minh");
    expect(url.searchParams.get("details")).toContain("Xanh lá");
    expect(url.searchParams.get("details")).toContain("https://example.com/i/private-token/linh");
  });

  it("uses the recipient name for the owner event", () => {
    const value = buildGoogleCalendarUrl(confirmation, {
      audience: "owner",
      ownerName: "Khang",
      recipientName: "Linh",
      invitationUrl: "https://example.com/i/private-token/linh",
    });

    expect(new URL(value).searchParams.get("text")).toBe("Date with Linh");
  });
});
