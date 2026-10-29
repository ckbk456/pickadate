/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");
const OWNER_EMAIL = "owner@example.com";

const functions = {
  enqueue: makeFunctionReference<
    "mutation",
    { invitationId: Id<"invitations">; eventType: "confirmation" | "cancellation" },
    Id<"emailDeliveries">[]
  >("email:enqueueForEvent"),
  retry: makeFunctionReference<
    "mutation",
    { deliveryId: Id<"emailDeliveries"> },
    { scheduled: boolean; status: string }
  >("email:retryDelivery"),
  purge: makeFunctionReference<"mutation", Record<string, never>, { purged: number }>(
    "crons:purgeRecipientEmails",
  ),
};

function setup() {
  vi.stubEnv("OWNER_EMAIL", OWNER_EMAIL);
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ email: OWNER_EMAIL, emailVerified: true });
  return { t, owner };
}

async function insertConfirmed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("ownerSettings", {
      normalizedEmail: OWNER_EMAIL,
      displayName: "Khang",
      timezone: "Asia/Ho_Chi_Minh",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("invitations", {
      publicToken: "36b8f84d-df4e-4d49-b662-bcde71a8764f",
      linkDigest: "digest",
      linkGeneration: 1,
      revision: 1,
      status: "confirmed",
      options: {
        recipientName: "Linh",
        slug: "linh",
        timezone: "Asia/Ho_Chi_Minh",
        slots: [],
        activities: [],
        colorModule: { enabled: false, presets: [] },
        transportEnabled: false,
        acknowledgedOverrides: [],
      },
      confirmation: {
        slot: { id: "slot", label: "Tối", startAt: 100, endAt: 200 },
        planItems: [
          {
            order: 0,
            activity: { id: "activity", label: "Đi ăn kem", timeTags: ["night"] },
            place: {
              id: "place",
              name: "Tiệm kem Mơ",
              address: "Quận 3",
              mapsUrl: "https://maps.google.com/?q=ice-cream",
              timeTags: ["night"],
              coverImageUrl: "/images/places/ice-cream-pastel.jpg",
              galleryImageUrls: [],
            },
          },
        ],
        recipientEmail: "linh@example.com",
        confirmationKey: "36b8f84d-df4e-4d49-b662-bcde71a8764f",
        confirmedAt: now,
      },
      confirmedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("transactional email state", () => {
  it("enqueues at most one delivery per audience and reuses stable idempotency keys", async () => {
    const { t, owner } = setup();
    const invitationId = await insertConfirmed(t);

    await t.mutation(functions.enqueue, { invitationId, eventType: "confirmation" });
    await t.mutation(functions.enqueue, { invitationId, eventType: "confirmation" });

    const deliveries = await t.run((ctx) =>
      ctx.db
        .query("emailDeliveries")
        .withIndex("by_invitation", (index) => index.eq("invitationId", invitationId))
        .collect(),
    );
    expect(deliveries).toHaveLength(2);
    expect(deliveries.map((item) => item.audience).sort()).toEqual(["owner", "recipient"]);
    expect(new Set(deliveries.map((item) => item.idempotencyKey)).size).toBe(2);

    const failed = deliveries[0]!;
    await t.run((ctx) =>
      ctx.db.patch(failed._id, {
        status: "failed",
        attemptCount: 4,
        completedAt: Date.now(),
      }),
    );
    await expect(owner.mutation(functions.retry, { deliveryId: failed._id })).resolves.toMatchObject({
      scheduled: true,
      status: "pending",
    });
    const retried = await t.run((ctx) => ctx.db.get(failed._id));
    expect(retried).toMatchObject({
      status: "pending",
      attemptCount: 0,
      idempotencyKey: failed.idempotencyKey,
    });
  });

  it("purges recipient email after the confirmed event has ended", async () => {
    const { t } = setup();
    const invitationId = await insertConfirmed(t);
    await t.mutation(functions.enqueue, { invitationId, eventType: "confirmation" });

    await expect(t.mutation(functions.purge, {})).resolves.toEqual({ purged: 1 });
    const invitation = await t.run((ctx) => ctx.db.get(invitationId));
    expect(invitation?.confirmation?.recipientEmail).toBeUndefined();
    const recipientDelivery = await t.run((ctx) =>
      ctx.db
        .query("emailDeliveries")
        .withIndex("by_invitation", (index) => index.eq("invitationId", invitationId))
        .filter((query) => query.eq(query.field("audience"), "recipient"))
        .unique(),
    );
    expect(recipientDelivery?.recipientEmail).toBeUndefined();
    expect(recipientDelivery?.purgedAt).toEqual(expect.any(Number));
  });
});
