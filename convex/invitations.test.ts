/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import type { InvitationOptions } from "../src/lib/domain/model";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);
const OWNER_EMAIL = "owner@example.com";
const CONFIRMATION_KEY = "36b8f84d-df4e-4d49-b662-bcde71a8764f";

type CreateResult = { id: Id<"invitations">; revision: number };
type ActivationResult =
  | { activated: false; issues: Array<{ code: string }> }
  | {
      activated: true;
      publicToken: string;
      linkGeneration: number;
      revision: number;
      issues: [];
    };
type RotationResult = { publicToken: string; linkGeneration: number };
type SaveResult = { revision: number; changed: boolean };
type CancelResult = { cancelled: boolean; revision: number; alreadyCancelled: boolean };

const functions = {
  createDraft: makeFunctionReference<
    "mutation",
    { options?: InvitationOptions },
    CreateResult
  >("invitations:createDraft"),
  saveDraft: makeFunctionReference<
    "mutation",
    { id: Id<"invitations">; expectedRevision: number; options: InvitationOptions },
    SaveResult
  >("invitations:saveDraft"),
  activate: makeFunctionReference<
    "mutation",
    { id: Id<"invitations">; expectedRevision: number },
    ActivationResult
  >("invitations:activate"),
  rotateLink: makeFunctionReference<
    "mutation",
    {
      id: Id<"invitations">;
      expectedRevision: number;
      expectedLinkGeneration: number;
    },
    RotationResult
  >("invitations:rotateLink"),
  reopenExpired: makeFunctionReference<
    "mutation",
    { id: Id<"invitations">; expectedRevision: number },
    { status: "draft"; revision: number }
  >("invitations:reopenExpired"),
  setArchived: makeFunctionReference<
    "mutation",
    {
      id: Id<"invitations">;
      expectedRevision: number;
      archived: boolean;
    },
    { archivedAt?: number; revision: number }
  >("invitations:setArchived"),
  cancel: makeFunctionReference<
    "mutation",
    { id: Id<"invitations">; expectedRevision: number },
    CancelResult
  >("invitations:cancel"),
  erase: makeFunctionReference<
    "mutation",
    {
      id: Id<"invitations">;
      expectedRevision: number;
      confirmationText: string;
    },
    { erased: true }
  >("invitations:erase"),
  getPublic: makeFunctionReference<"query", { token: string }, unknown>(
    "invitations:getPublic",
  ),
  confirm: makeFunctionReference<
    "mutation",
    {
      token: string;
      expectedLinkGeneration: number;
      expectedRevision: number;
      slotId: string;
      activityId: string;
      placeId: string;
      colorId?: string;
      transport?: "pickup" | "meet-there" | "decide-later";
      recipientEmail?: string;
      confirmationKey: string;
    },
    Record<string, unknown>
  >("invitations:confirm"),
};

function validOptions(recipientName = "Linh"): InvitationOptions {
  const startAt = Date.now() + 86_400_000;
  return {
    recipientName,
    slug: `${recipientName.toLocaleLowerCase("en-US")}-cuoi-tuan`,
    message: "Mình đi chơi nhé?",
    timezone: "Asia/Ho_Chi_Minh",
    slots: [
      {
        id: "slot-afternoon",
        label: "Buổi chiều",
        startAt,
        endAt: startAt + 3 * 60 * 60_000,
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
            name: "Sân Kỳ Hòa",
            address: "Quận 10, TP.HCM",
            mapsUrl: "https://maps.google.com/?q=Ky+Hoa",
            timeTags: ["afternoon"],
            coverImageUrl: "/images/places/badminton-ky-hoa.jpg",
            galleryImageUrls: [],
          },
        ],
      },
    ],
    colorModule: {
      enabled: true,
      presets: [{ id: "sage", label: "Xanh lá", hex: "#829173" }],
    },
    transportEnabled: true,
    acknowledgedOverrides: [],
  };
}

function setup() {
  vi.stubEnv("OWNER_EMAIL", OWNER_EMAIL);
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    email: OWNER_EMAIL,
    emailVerified: true,
    name: "Khang",
  });
  return { t, owner };
}

async function createActive(
  owner: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  options = validOptions(),
) {
  const draft = await owner.mutation(functions.createDraft, { options });
  const activation = await owner.mutation(functions.activate, {
    id: draft.id,
    expectedRevision: draft.revision,
  });
  if (!activation.activated) {
    throw new Error(`Fixture activation failed: ${JSON.stringify(activation.issues)}`);
  }
  return { draft, activation };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("invitation lifecycle", () => {
  it("keeps Draft private and rotates an Active bearer link immediately", async () => {
    const { owner, t } = setup();
    const draft = await owner.mutation(functions.createDraft, { options: validOptions() });

    await expect(
      t.query(functions.getPublic, { token: "36b8f84d-df4e-4d49-b662-bcde71a8764f" }),
    ).resolves.toEqual({ state: "unavailable" });

    const activation = await owner.mutation(functions.activate, {
      id: draft.id,
      expectedRevision: draft.revision,
    });
    expect(activation.activated).toBe(true);
    if (!activation.activated) return;

    await expect(
      t.query(functions.getPublic, { token: activation.publicToken }),
    ).resolves.toMatchObject({
      state: "active",
      recipientName: "Linh",
      ownerName: "Khang",
      linkGeneration: 1,
    });

    const rotated = await owner.mutation(functions.rotateLink, {
      id: draft.id,
      expectedRevision: activation.revision,
      expectedLinkGeneration: activation.linkGeneration,
    });
    expect(rotated.publicToken).not.toBe(activation.publicToken);
    await expect(
      t.query(functions.getPublic, { token: activation.publicToken }),
    ).resolves.toEqual({ state: "unavailable" });
    await expect(
      t.query(functions.getPublic, { token: rotated.publicToken }),
    ).resolves.toMatchObject({ state: "active", linkGeneration: 2 });
  });

  it("rejects stale confirmation after a live owner edit", async () => {
    const { owner, t } = setup();
    const options = validOptions();
    const { draft, activation } = await createActive(owner, options);
    options.message = "Nội dung mới";
    const saved = await owner.mutation(functions.saveDraft, {
      id: draft.id,
      expectedRevision: activation.revision,
      options,
    });
    expect(saved).toMatchObject({ changed: true, revision: activation.revision + 1 });

    await expect(
      t.mutation(functions.confirm, {
        token: activation.publicToken,
        expectedLinkGeneration: activation.linkGeneration,
        expectedRevision: activation.revision,
        slotId: "slot-afternoon",
        activityId: "badminton",
        placeId: "ky-hoa",
        colorId: "sage",
        transport: "pickup",
        confirmationKey: CONFIRMATION_KEY,
      }),
    ).resolves.toMatchObject({ outcome: "stale", revision: saved.revision });
  });

  it("keeps archive separate from lifecycle and reactivates Expired with a new link", async () => {
    const { owner, t } = setup();
    const draft = await owner.mutation(functions.createDraft, { options: validOptions() });
    const archived = await owner.mutation(functions.setArchived, {
      id: draft.id,
      expectedRevision: draft.revision,
      archived: true,
    });
    expect(archived.archivedAt).toEqual(expect.any(Number));
    const restored = await owner.mutation(functions.setArchived, {
      id: draft.id,
      expectedRevision: archived.revision,
      archived: false,
    });

    const activation = await owner.mutation(functions.activate, {
      id: draft.id,
      expectedRevision: restored.revision,
    });
    expect(activation.activated).toBe(true);
    if (!activation.activated) return;

    await t.run(async (ctx) => {
      const invitation = await ctx.db.get(draft.id);
      if (!invitation) throw new Error("Missing fixture invitation.");
      await ctx.db.patch(draft.id, {
        options: {
          ...invitation.options,
          slots: invitation.options.slots.map((slot) => ({
            ...slot,
            startAt: 100,
            endAt: 200,
          })),
        },
      });
    });

    const reopened = await owner.mutation(functions.reopenExpired, {
      id: draft.id,
      expectedRevision: activation.revision,
    });
    await expect(
      t.query(functions.getPublic, { token: activation.publicToken }),
    ).resolves.toEqual({ state: "unavailable" });

    const options = validOptions();
    const saved = await owner.mutation(functions.saveDraft, {
      id: draft.id,
      expectedRevision: reopened.revision,
      options,
    });
    const reactivated = await owner.mutation(functions.activate, {
      id: draft.id,
      expectedRevision: saved.revision,
    });
    expect(reactivated).toMatchObject({ activated: true, linkGeneration: 2 });
    if (reactivated.activated) {
      expect(reactivated.publicToken).not.toBe(activation.publicToken);
    }
  });

  it("confirms idempotently and invalidates overlapping Active invitations", async () => {
    const { owner, t } = setup();
    const first = await createActive(owner, validOptions("Linh"));
    const second = await createActive(owner, validOptions("Mai"));
    const request = {
      token: first.activation.publicToken,
      expectedLinkGeneration: first.activation.linkGeneration,
      expectedRevision: first.activation.revision,
      slotId: "slot-afternoon",
      activityId: "badminton",
      placeId: "ky-hoa",
      colorId: "sage",
      transport: "pickup" as const,
      recipientEmail: "LINH@example.com",
      confirmationKey: CONFIRMATION_KEY,
    };

    const confirmed = await t.mutation(functions.confirm, request);
    expect(confirmed).toMatchObject({
      outcome: "confirmed",
      idempotent: false,
      invalidatedInvitationCount: 1,
    });
    await expect(t.mutation(functions.confirm, request)).resolves.toMatchObject({
      outcome: "confirmed",
      idempotent: true,
    });

    await expect(
      t.query(functions.getPublic, { token: second.activation.publicToken }),
    ).resolves.toEqual({ state: "ended", reason: "expired" });
    const secondDocument = await t.run((ctx) => ctx.db.get(second.draft.id));
    expect(secondDocument).toMatchObject({ status: "expired", options: { slots: [] } });
  });

  it("keeps the final plan after cancellation and erases only invitation-owned data", async () => {
    const { owner, t } = setup();
    const { draft, activation } = await createActive(owner);
    const confirmation = await t.mutation(functions.confirm, {
      token: activation.publicToken,
      expectedLinkGeneration: activation.linkGeneration,
      expectedRevision: activation.revision,
      slotId: "slot-afternoon",
      activityId: "badminton",
      placeId: "ky-hoa",
      colorId: "sage",
      transport: "decide-later",
      confirmationKey: CONFIRMATION_KEY,
    });
    const confirmedRevision = Number(confirmation.revision);

    const cancelled = await owner.mutation(functions.cancel, {
      id: draft.id,
      expectedRevision: confirmedRevision,
    });
    await expect(
      t.query(functions.getPublic, { token: activation.publicToken }),
    ).resolves.toMatchObject({
      state: "cancelled",
      confirmation: { planItems: [{ activity: { id: "badminton" } }] },
    });

    await owner.mutation(functions.erase, {
      id: draft.id,
      expectedRevision: cancelled.revision,
      confirmationText: "ERASE INVITATION",
    });
    await expect(
      t.query(functions.getPublic, { token: activation.publicToken }),
    ).resolves.toEqual({ state: "unavailable" });
    const tombstones = await t.run((ctx) => ctx.db.query("invitationTombstones").collect());
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({
      invitationId: draft.id,
      lastLinkGeneration: activation.linkGeneration,
    });
  });
});
