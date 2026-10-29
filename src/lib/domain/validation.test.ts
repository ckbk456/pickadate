import { describe, expect, it } from "vitest";
import { APP_TIMEZONE, type Confirmation, type InvitationOptions } from "./model";
import {
  canArchiveInvitation,
  getCompatibilityWarnings,
  rangesOverlap,
  validateActivation,
  validatePlanItems,
} from "./validation";

const NOW = Date.UTC(2026, 7, 5, 0, 0, 0);

function validOptions(): InvitationOptions {
  return {
    recipientName: "Linh",
    slug: "linh-cuoi-tuan",
    timezone: APP_TIMEZONE,
    slots: [
      {
        id: "slot-1",
        label: "Buổi chiều",
        startAt: NOW + 86_400_000,
        endAt: NOW + 86_400_000 + 10_800_000,
      },
    ],
    activities: [
      {
        id: "badminton",
        label: "Đánh cầu lông",
        durationMinutes: 120,
        timeTags: ["afternoon"],
        places: [
          {
            id: "ky-hoa",
            name: "Sân cầu lông Kỳ Hòa",
            address: "238/2 Lý Thường Kiệt, Quận 10, TP.HCM",
            mapsUrl: "https://maps.google.com/?q=Ky+Hoa",
            timeTags: ["afternoon"],
            coverImageUrl: "/images/places/badminton-ky-hoa.jpg",
            galleryImageUrls: [],
          },
        ],
      },
    ],
    colorModule: { enabled: true, presets: [{ id: "sage", label: "Xanh lá", hex: "#829173" }] },
    transportEnabled: true,
    acknowledgedOverrides: [],
  };
}

describe("invitation activation", () => {
  it("accepts a complete future invitation", () => {
    expect(validateActivation(validOptions(), NOW)).toEqual([]);
  });

  it("reports local fix paths for incomplete drafts", () => {
    const options = validOptions();
    options.recipientName = "";
    options.activities[0]!.places = [];

    expect(validateActivation(options, NOW)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "recipient" }),
        expect.objectContaining({ path: "plan" }),
      ]),
    );
  });

  it("requires compatibility overrides to be acknowledged", () => {
    const options = validOptions();
    options.activities[0]!.durationMinutes = 240;
    const [warning] = getCompatibilityWarnings(options);

    expect(warning?.reason).toBe("duration");
    expect(validateActivation(options, NOW)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "compatibility" })]),
    );

    options.acknowledgedOverrides = [warning!.key];
    expect(validateActivation(options, NOW)).toEqual([]);
  });
});

describe("lifecycle helpers", () => {
  it("uses half-open overlap semantics", () => {
    expect(
      rangesOverlap(
        { startAt: 100, endAt: 200 },
        { startAt: 199, endAt: 300 },
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        { startAt: 100, endAt: 200 },
        { startAt: 200, endAt: 300 },
      ),
    ).toBe(false);
  });

  it("only archives confirmed invitations after the event", () => {
    const confirmation = {
      slot: { id: "slot", label: "Afternoon", startAt: 100, endAt: 200 },
      planItems: [],
      confirmedAt: 90,
    } satisfies Confirmation;

    expect(canArchiveInvitation("confirmed", confirmation, 199)).toBe(false);
    expect(canArchiveInvitation("confirmed", confirmation, 200)).toBe(true);
    expect(canArchiveInvitation("active", undefined, 500)).toBe(false);
  });

  it("enforces one ordered plan item", () => {
    const options = validOptions();
    const activity = options.activities[0]!;
    const confirmation = {
      slot: options.slots[0]!,
      planItems: [
        {
          order: 0,
          activity: {
            id: activity.id,
            label: activity.label,
            durationMinutes: activity.durationMinutes,
            timeTags: activity.timeTags,
          },
          place: activity.places[0]!,
        },
      ],
      confirmedAt: NOW,
    } satisfies Confirmation;

    expect(validatePlanItems(confirmation)).toBe(true);
    confirmation.planItems[0]!.order = 1;
    expect(validatePlanItems(confirmation)).toBe(false);
  });
});
