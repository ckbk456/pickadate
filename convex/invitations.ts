import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { assertOwner } from "./lib/owner";
import {
  canArchiveInvitation,
  isValidEmail,
  normalizeEmail,
  rangesOverlap,
  validateActivation,
} from "../src/lib/domain/validation";
import { digestBearerToken, isUuidV4 } from "../src/lib/domain/privacy";
import type {
  ActivationIssue,
  ActivitySnapshot,
  InvitationOptions,
  InvitationSlot,
  PlaceSnapshot,
} from "../src/lib/domain/model";
import { invitationOptions, transportOption } from "./validators";

const MAX_SLOTS = 64;
const MAX_ACTIVITIES = 32;
const MAX_PLACES_PER_ACTIVITY = 64;
const MAX_COLOR_PRESETS = 32;
const MAX_GALLERY_IMAGES = 24;
const ERASE_CONFIRMATION = "ERASE INVITATION";

type Invitation = Doc<"invitations">;
type LifecycleEvent =
  | "created"
  | "activated"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "reopened"
  | "archived"
  | "unarchived"
  | "overlap-pruned"
  | "link-rotated";

function emptyOptions(): InvitationOptions {
  return {
    recipientName: "",
    slug: "",
    timezone: "Asia/Ho_Chi_Minh",
    slots: [],
    activities: [],
    colorModule: { enabled: false, presets: [] },
    transportEnabled: false,
    acknowledgedOverrides: [],
  };
}

function boundedText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim().normalize("NFKC");
  if (normalized.length > maxLength) {
    throw new ConvexError(`${field} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function optionalText(
  value: string | undefined,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  return boundedText(value, field, maxLength) || undefined;
}

function stableId(value: string, field: string): string {
  const normalized = boundedText(value, field, 120);
  if (!normalized) throw new ConvexError(`${field} is required.`);
  return normalized;
}

function uniqueValues(values: string[], field: string, maxItems = 256): string[] {
  if (values.length > maxItems) {
    throw new ConvexError(`${field} has too many values.`);
  }
  return [
    ...new Set(
      values.map((value) => boundedText(value, field, 200)).filter((value) => value.length > 0),
    ),
  ];
}

function assertUniqueIds(items: Array<{ id: string }>, field: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new ConvexError(`${field} must use unique identifiers.`);
  }
}

function normalizeSlot(slot: InvitationSlot): InvitationSlot {
  if (!Number.isSafeInteger(slot.startAt) || !Number.isSafeInteger(slot.endAt)) {
    throw new ConvexError("Slot times must be exact millisecond timestamps.");
  }
  return {
    id: stableId(slot.id, "Slot identifier"),
    label: boundedText(slot.label, "Slot label", 120),
    startAt: slot.startAt,
    endAt: slot.endAt,
  };
}

function normalizePlace(place: PlaceSnapshot): PlaceSnapshot {
  if (place.galleryImageUrls.length > MAX_GALLERY_IMAGES) {
    throw new ConvexError(`A place may include at most ${MAX_GALLERY_IMAGES} gallery images.`);
  }
  return {
    id: stableId(place.id, "Place option identifier"),
    catalogPlaceId: optionalText(place.catalogPlaceId, "Catalog place identifier", 200),
    name: boundedText(place.name, "Place name", 120),
    address: boundedText(place.address, "Place address", 300),
    mapsUrl: boundedText(place.mapsUrl, "Google Maps URL", 2_048),
    note: optionalText(place.note, "Place note", 1_000),
    timeTags: [...new Set(place.timeTags)],
    coverImageUrl: boundedText(place.coverImageUrl, "Cover image URL", 2_048),
    galleryImageUrls: uniqueValues(place.galleryImageUrls, "Gallery image URL", MAX_GALLERY_IMAGES),
  };
}

function normalizeActivity(activity: ActivitySnapshot): ActivitySnapshot {
  if (activity.places.length > MAX_PLACES_PER_ACTIVITY) {
    throw new ConvexError(
      `An activity may include at most ${MAX_PLACES_PER_ACTIVITY} places.`,
    );
  }
  if (
    activity.durationMinutes !== undefined &&
    (!Number.isSafeInteger(activity.durationMinutes) ||
      activity.durationMinutes < 15 ||
      activity.durationMinutes > 720)
  ) {
    throw new ConvexError("Activity duration must be between 15 minutes and 12 hours.");
  }

  const places = activity.places.map(normalizePlace);
  assertUniqueIds(places, "Places within an activity");
  return {
    id: stableId(activity.id, "Activity option identifier"),
    catalogActivityId: optionalText(
      activity.catalogActivityId,
      "Catalog activity identifier",
      200,
    ),
    label: boundedText(activity.label, "Activity label", 120),
    description: optionalText(activity.description, "Activity description", 1_000),
    durationMinutes: activity.durationMinutes,
    timeTags: [...new Set(activity.timeTags)],
    places,
  };
}

function normalizeOptions(options: InvitationOptions): InvitationOptions {
  if (options.slots.length > MAX_SLOTS) {
    throw new ConvexError(`An invitation may include at most ${MAX_SLOTS} slots.`);
  }
  if (options.activities.length > MAX_ACTIVITIES) {
    throw new ConvexError(`An invitation may include at most ${MAX_ACTIVITIES} activities.`);
  }
  if (options.colorModule.presets.length > MAX_COLOR_PRESETS) {
    throw new ConvexError(
      `The outfit module may include at most ${MAX_COLOR_PRESETS} colors.`,
    );
  }

  const slots = options.slots.map(normalizeSlot);
  const activities = options.activities.map(normalizeActivity);
  const presets = options.colorModule.presets.map((preset) => ({
    id: stableId(preset.id, "Color identifier"),
    label: boundedText(preset.label, "Color label", 80),
    hex: boundedText(preset.hex, "Color value", 20),
  }));
  assertUniqueIds(slots, "Slots");
  assertUniqueIds(activities, "Activities");
  assertUniqueIds(presets, "Colors");

  return {
    recipientName: boundedText(options.recipientName, "Recipient name", 100),
    slug: boundedText(options.slug, "Invitation slug", 100).toLocaleLowerCase("en-US"),
    message: optionalText(options.message, "Invitation message", 2_000),
    timezone: options.timezone,
    slots,
    activities,
    colorModule: {
      enabled: options.colorModule.enabled,
      presets,
    },
    transportEnabled: options.transportEnabled,
    acknowledgedOverrides: uniqueValues(
      options.acknowledgedOverrides,
      "Compatibility override",
    ),
  };
}

function futureSlots(options: InvitationOptions, now: number): InvitationSlot[] {
  return options.slots.filter(
    (slot) => slot.startAt > now && slot.endAt > slot.startAt,
  );
}

function effectiveStatus(invitation: Invitation, now: number) {
  if (invitation.status === "active" && futureSlots(invitation.options, now).length === 0) {
    return "expired" as const;
  }
  return invitation.status;
}

function expectedRevision(invitation: Invitation, revision: number) {
  if (!Number.isSafeInteger(revision) || invitation.revision !== revision) {
    throw new ConvexError("This invitation changed. Refresh it before saving again.");
  }
}

async function recordEvent(
  ctx: MutationCtx,
  invitationId: Id<"invitations">,
  type: LifecycleEvent,
  createdAt: number,
  reason?: string,
) {
  await ctx.db.insert("invitationEvents", {
    invitationId,
    type,
    reason,
    createdAt,
  });
}

function generatedUuidV4(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

async function issueCredential(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicToken = generatedUuidV4();
    const linkDigest = await digestBearerToken(publicToken);
    const collision = await ctx.db
      .query("invitations")
      .withIndex("by_link_digest", (index) => index.eq("linkDigest", linkDigest))
      .first();
    if (!collision) return { publicToken, linkDigest };
  }
  throw new ConvexError("Could not create a private invitation link. Try again.");
}

async function findByToken(ctx: QueryCtx | MutationCtx, suppliedToken: string) {
  const publicToken = suppliedToken.trim().toLocaleLowerCase("en-US");
  if (!isUuidV4(publicToken)) return null;
  const linkDigest = await digestBearerToken(publicToken);
  const invitation = await ctx.db
    .query("invitations")
    .withIndex("by_link_digest", (index) => index.eq("linkDigest", linkDigest))
    .unique();
  if (!invitation || invitation.publicToken !== publicToken) return null;
  return invitation;
}

async function catalogReferenceIssues(
  ctx: MutationCtx,
  options: InvitationOptions,
): Promise<ActivationIssue[]> {
  const issues: ActivationIssue[] = [];
  for (const activity of options.activities) {
    let catalogActivity: Doc<"activities"> | null = null;
    if (activity.catalogActivityId) {
      const id = ctx.db.normalizeId("activities", activity.catalogActivityId);
      catalogActivity = id ? await ctx.db.get(id) : null;
      if (!catalogActivity) {
        issues.push({
          code: `catalog-activity:${activity.id}`,
          path: "plan",
          message: `${activity.label || "An activity"} no longer exists in the catalog.`,
        });
      }
    }

    for (const place of activity.places) {
      if (!place.catalogPlaceId) continue;
      const id = ctx.db.normalizeId("places", place.catalogPlaceId);
      const catalogPlace = id ? await ctx.db.get(id) : null;
      if (!catalogPlace) {
        issues.push({
          code: `catalog-place:${activity.id}:${place.id}`,
          path: "plan",
          message: `${place.name || "A place"} no longer exists in the catalog.`,
        });
        continue;
      }
      if (
        catalogActivity &&
        !catalogPlace.activityIds.some((activityId) => activityId === catalogActivity._id)
      ) {
        issues.push({
          code: `catalog-association:${activity.id}:${place.id}`,
          path: "plan",
          message: `${place.name || "A place"} is no longer associated with ${
            activity.label || "this activity"
          }.`,
        });
      }
    }
  }
  return issues;
}

function additionalActivationIssues(options: InvitationOptions, now: number): ActivationIssue[] {
  const issues: ActivationIssue[] = [];
  for (const slot of options.slots) {
    if (!slot.label) {
      issues.push({
        code: `slot-label:${slot.id}`,
        path: "time",
        message: "Every slot needs a friendly label.",
      });
    }
    if (slot.endAt <= slot.startAt) {
      issues.push({
        code: `slot-range:${slot.id}`,
        path: "time",
        message: `${slot.label || "A slot"} must end after it starts.`,
      });
    }
  }
  for (const activity of options.activities) {
    if (!activity.label) {
      issues.push({
        code: `activity-label:${activity.id}`,
        path: "plan",
        message: "Every enabled activity needs a label.",
      });
    }
    for (const place of activity.places) {
      if (!place.name || !place.address || !place.coverImageUrl) {
        issues.push({
          code: `place-fields:${activity.id}:${place.id}`,
          path: "plan",
          message: "Every enabled place needs a name, address, and cover image.",
        });
      }
    }
  }
  if (options.colorModule.enabled) {
    for (const preset of options.colorModule.presets) {
      if (!preset.label || !/^#[0-9a-f]{6}$/iu.test(preset.hex)) {
        issues.push({
          code: `color:${preset.id}`,
          path: "extras",
          message: "Every enabled outfit color needs a label and six-digit hex value.",
        });
      }
    }
  }

  const seen = new Set<string>();
  return [...validateActivation(options, now), ...issues].filter((issue) => {
    if (seen.has(issue.code)) return false;
    seen.add(issue.code);
    return true;
  });
}

function publicPlace(place: PlaceSnapshot) {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    mapsUrl: place.mapsUrl,
    note: place.note,
    timeTags: place.timeTags,
    coverImageUrl: place.coverImageUrl,
    galleryImageUrls: place.galleryImageUrls,
  };
}

function publicActivity(activity: ActivitySnapshot) {
  return {
    id: activity.id,
    label: activity.label,
    description: activity.description,
    durationMinutes: activity.durationMinutes,
    timeTags: activity.timeTags,
    places: activity.places.map(publicPlace),
  };
}

function publicConfirmation(confirmation: NonNullable<Invitation["confirmation"]>) {
  return {
    slot: confirmation.slot,
    planItems: confirmation.planItems.map((item) => ({
      order: item.order,
      activity: {
        id: item.activity.id,
        label: item.activity.label,
        description: item.activity.description,
        durationMinutes: item.activity.durationMinutes,
        timeTags: item.activity.timeTags,
      },
      place: publicPlace(item.place),
    })),
    color: confirmation.color,
    transport: confirmation.transport,
    confirmedAt: confirmation.confirmedAt,
  };
}

function ownerSummary(invitation: Invitation, now: number) {
  return {
    id: invitation._id,
    recipientName: invitation.options.recipientName,
    slug: invitation.options.slug,
    status: effectiveStatus(invitation, now),
    storedStatus: invitation.status,
    revision: invitation.revision,
    linkGeneration: invitation.linkGeneration,
    slotCount: futureSlots(invitation.options, now).length,
    confirmedSlot: invitation.confirmation?.slot,
    archivedAt: invitation.archivedAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const now = Date.now();
    const invitations = await ctx.db.query("invitations").collect();
    return invitations
      .filter((invitation) => args.includeArchived || !invitation.archivedAt)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((invitation) => ownerSummary(invitation, now));
  },
});

export const get = query({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    return {
      id: invitation._id,
      status: effectiveStatus(invitation, Date.now()),
      storedStatus: invitation.status,
      revision: invitation.revision,
      linkGeneration: invitation.linkGeneration,
      publicToken: invitation.publicToken,
      options: invitation.options,
      confirmation: invitation.confirmation
        ? {
            ...publicConfirmation(invitation.confirmation),
            hasRecipientEmail: invitation.confirmation.recipientEmail !== undefined,
          }
        : undefined,
      activatedAt: invitation.activatedAt,
      confirmedAt: invitation.confirmedAt,
      cancelledAt: invitation.cancelledAt,
      expiredAt: invitation.expiredAt,
      archivedAt: invitation.archivedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  },
});

export const createDraft = mutation({
  args: { options: v.optional(invitationOptions) },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("invitations", {
      linkGeneration: 0,
      revision: 0,
      status: "draft",
      options: normalizeOptions(args.options ?? emptyOptions()),
      createdAt: now,
      updatedAt: now,
    });
    await recordEvent(ctx, id, "created", now);
    return { id, revision: 0 };
  },
});

export const saveDraft = mutation({
  args: {
    id: v.id("invitations"),
    expectedRevision: v.number(),
    options: invitationOptions,
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    expectedRevision(invitation, args.expectedRevision);
    if (invitation.archivedAt) {
      throw new ConvexError("Restore this invitation before editing it.");
    }
    if (invitation.status !== "draft" && invitation.status !== "active") {
      throw new ConvexError("Only Draft and Active invitations can be edited.");
    }

    const options = normalizeOptions(args.options);
    if (JSON.stringify(options) === JSON.stringify(normalizeOptions(invitation.options))) {
      return { revision: invitation.revision, changed: false };
    }

    const revision = invitation.revision + 1;
    await ctx.db.patch(invitation._id, {
      options,
      revision,
      updatedAt: Date.now(),
    });
    return { revision, changed: true };
  },
});

export const activate = mutation({
  args: { id: v.id("invitations"), expectedRevision: v.number() },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    expectedRevision(invitation, args.expectedRevision);
    if (invitation.status !== "draft" || invitation.archivedAt) {
      throw new ConvexError("Only an unarchived Draft invitation can be activated.");
    }

    const now = Date.now();
    const options = normalizeOptions(invitation.options);
    const issues = [
      ...additionalActivationIssues(options, now),
      ...(await catalogReferenceIssues(ctx, options)),
    ];
    if (issues.length > 0) return { activated: false as const, issues };

    const prunedOptions = {
      ...options,
      slots: futureSlots(options, now),
    };
    const credential = await issueCredential(ctx);
    const revision = invitation.revision + 1;
    const linkGeneration = invitation.linkGeneration + 1;
    await ctx.db.patch(invitation._id, {
      ...credential,
      linkGeneration,
      revision,
      status: "active",
      options: prunedOptions,
      activatedAt: now,
      expiredAt: undefined,
      updatedAt: now,
    });
    await recordEvent(ctx, invitation._id, "activated", now);
    return {
      activated: true as const,
      publicToken: credential.publicToken,
      linkGeneration,
      revision,
      issues: [],
    };
  },
});

export const rotateLink = mutation({
  args: {
    id: v.id("invitations"),
    expectedRevision: v.number(),
    expectedLinkGeneration: v.number(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    expectedRevision(invitation, args.expectedRevision);
    if (invitation.linkGeneration !== args.expectedLinkGeneration) {
      throw new ConvexError("This invitation link was already changed. Refresh before rotating again.");
    }
    if (invitation.archivedAt) throw new ConvexError("Restore this invitation first.");
    const currentStatus = effectiveStatus(invitation, Date.now());
    const exposesFinalCard = invitation.confirmation !== undefined;
    if (currentStatus !== "active" && currentStatus !== "confirmed" && !exposesFinalCard) {
      throw new ConvexError("This invitation does not have a rotatable public link.");
    }

    const credential = await issueCredential(ctx);
    const now = Date.now();
    const linkGeneration = invitation.linkGeneration + 1;
    await ctx.db.patch(invitation._id, {
      ...credential,
      linkGeneration,
      updatedAt: now,
    });
    await recordEvent(ctx, invitation._id, "link-rotated", now);
    return { publicToken: credential.publicToken, linkGeneration };
  },
});

export const cancel = mutation({
  args: { id: v.id("invitations"), expectedRevision: v.number() },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    if (invitation.status === "cancelled") {
      return { cancelled: true, revision: invitation.revision, alreadyCancelled: true };
    }
    expectedRevision(invitation, args.expectedRevision);
    if (!["draft", "active", "confirmed"].includes(invitation.status)) {
      throw new ConvexError("This invitation can no longer be cancelled.");
    }
    if (effectiveStatus(invitation, Date.now()) === "expired") {
      throw new ConvexError("This invitation has expired. Reopen it as a Draft instead.");
    }

    const now = Date.now();
    const revision = invitation.revision + 1;
    await ctx.db.patch(invitation._id, {
      status: "cancelled",
      cancelledAt: now,
      revision,
      updatedAt: now,
    });
    await recordEvent(ctx, invitation._id, "cancelled", now);
    if (invitation.confirmation?.recipientEmail) {
      await ctx.scheduler.runAfter(0, internal.email.enqueueForEvent, {
        invitationId: invitation._id,
        eventType: "cancellation",
      });
    }
    return { cancelled: true, revision, alreadyCancelled: false };
  },
});

export const reopenExpired = mutation({
  args: { id: v.id("invitations"), expectedRevision: v.number() },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    expectedRevision(invitation, args.expectedRevision);
    if (effectiveStatus(invitation, Date.now()) !== "expired") {
      throw new ConvexError("Only an Expired invitation can return to Draft.");
    }

    const now = Date.now();
    const revision = invitation.revision + 1;
    await ctx.db.patch(invitation._id, {
      publicToken: undefined,
      linkDigest: undefined,
      status: "draft",
      revision,
      expiredAt: undefined,
      archivedAt: undefined,
      updatedAt: now,
    });
    await recordEvent(ctx, invitation._id, "reopened", now);
    return { status: "draft" as const, revision };
  },
});

export const setArchived = mutation({
  args: {
    id: v.id("invitations"),
    expectedRevision: v.number(),
    archived: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    expectedRevision(invitation, args.expectedRevision);
    const now = Date.now();

    if (args.archived) {
      const status = effectiveStatus(invitation, now);
      if (!canArchiveInvitation(status, invitation.confirmation, now)) {
        throw new ConvexError("This invitation is still operational and cannot be archived.");
      }
      if (invitation.archivedAt) {
        return { archivedAt: invitation.archivedAt, revision: invitation.revision };
      }
      const revision = invitation.revision + 1;
      await ctx.db.patch(invitation._id, {
        status,
        expiredAt:
          status === "expired" ? invitation.expiredAt ?? now : invitation.expiredAt,
        archivedAt: now,
        revision,
        updatedAt: now,
      });
      if (invitation.status !== "expired" && status === "expired") {
        await recordEvent(ctx, invitation._id, "expired", now);
      }
      await recordEvent(ctx, invitation._id, "archived", now);
      return { archivedAt: now, revision };
    }

    if (!invitation.archivedAt) {
      return { archivedAt: undefined, revision: invitation.revision };
    }
    const revision = invitation.revision + 1;
    await ctx.db.patch(invitation._id, {
      archivedAt: undefined,
      revision,
      updatedAt: now,
    });
    await recordEvent(ctx, invitation._id, "unarchived", now);
    return { archivedAt: undefined, revision };
  },
});

export const erase = mutation({
  args: {
    id: v.id("invitations"),
    expectedRevision: v.number(),
    confirmationText: v.string(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found.");
    expectedRevision(invitation, args.expectedRevision);
    if (args.confirmationText !== ERASE_CONFIRMATION) {
      throw new ConvexError(`Type ${ERASE_CONFIRMATION} to permanently erase this invitation.`);
    }

    const erasedAt = Date.now();
    const revokedLinkDigest = invitation.linkDigest;
    await ctx.db.patch(invitation._id, {
      publicToken: undefined,
      linkDigest: undefined,
      updatedAt: erasedAt,
    });

    const [deliveries, events] = await Promise.all([
      ctx.db
        .query("emailDeliveries")
        .withIndex("by_invitation", (index) => index.eq("invitationId", invitation._id))
        .collect(),
      ctx.db
        .query("invitationEvents")
        .withIndex("by_invitation", (index) => index.eq("invitationId", invitation._id))
        .collect(),
    ]);
    for (const delivery of deliveries) await ctx.db.delete(delivery._id);
    for (const event of events) await ctx.db.delete(event._id);

    await ctx.db.insert("invitationTombstones", {
      invitationId: invitation._id,
      revokedLinkDigest,
      lastLinkGeneration: invitation.linkGeneration,
      erasedAt,
    });
    await ctx.db.delete(invitation._id);
    return { erased: true as const };
  },
});

export const getPublic = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await findByToken(ctx, args.token);
    if (!invitation || invitation.status === "draft") {
      return { state: "unavailable" as const };
    }

    const now = Date.now();
    const status = effectiveStatus(invitation, now);
    if (status === "active") {
      const owner = await ctx.db.query("ownerSettings").first();
      return {
        state: "active" as const,
        linkGeneration: invitation.linkGeneration,
        revision: invitation.revision,
        recipientName: invitation.options.recipientName,
        ownerName: owner?.displayName ?? "Khang",
        message: invitation.options.message,
        timezone: invitation.options.timezone,
        slots: futureSlots(invitation.options, now),
        activities: invitation.options.activities.map(publicActivity),
        colorModule: invitation.options.colorModule,
        transportEnabled: invitation.options.transportEnabled,
      };
    }

    if (
      (status === "confirmed" || status === "cancelled") &&
      invitation.confirmation
    ) {
      const owner = await ctx.db.query("ownerSettings").first();
      return {
        state: status,
        linkGeneration: invitation.linkGeneration,
        revision: invitation.revision,
        recipientName: invitation.options.recipientName,
        ownerName: owner?.displayName ?? "Khang",
        timezone: invitation.options.timezone,
        confirmation: publicConfirmation(invitation.confirmation),
      };
    }

    if (status === "expired" || status === "cancelled") {
      return { state: "ended" as const, reason: status };
    }
    return { state: "unavailable" as const };
  },
});

function normalizeConfirmationEmail(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return { valid: true as const, value: undefined };
  }
  if (!isValidEmail(value)) return { valid: false as const, value: undefined };
  return { valid: true as const, value: normalizeEmail(value) };
}

type ConfirmationRequest = {
  slotId: string;
  activityId: string;
  placeId: string;
  colorId?: string;
  transport?: "pickup" | "meet-there" | "decide-later";
  recipientEmail?: string;
  confirmationKey: string;
};

function matchesConfirmation(
  existing: NonNullable<Invitation["confirmation"]>,
  request: ConfirmationRequest,
  recipientEmail: string | undefined,
) {
  const item = existing.planItems[0];
  return (
    existing.confirmationKey === request.confirmationKey &&
    existing.slot.id === request.slotId &&
    item?.activity.id === request.activityId &&
    item.place.id === request.placeId &&
    existing.color?.id === request.colorId &&
    existing.transport === request.transport &&
    existing.recipientEmail === recipientEmail
  );
}

export const confirm = mutation({
  args: {
    token: v.string(),
    expectedLinkGeneration: v.number(),
    expectedRevision: v.number(),
    slotId: v.string(),
    activityId: v.string(),
    placeId: v.string(),
    colorId: v.optional(v.string()),
    transport: v.optional(transportOption),
    recipientEmail: v.optional(v.string()),
    confirmationKey: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await findByToken(ctx, args.token);
    if (!invitation) return { outcome: "unavailable" as const };

    const email = normalizeConfirmationEmail(args.recipientEmail);
    if (!email.valid) {
      return { outcome: "invalid-selection" as const, field: "recipientEmail" as const };
    }
    const confirmationKey = args.confirmationKey.trim().toLocaleLowerCase("en-US");
    if (!isUuidV4(confirmationKey)) {
      return { outcome: "invalid-selection" as const, field: "confirmationKey" as const };
    }

    const request = { ...args, confirmationKey };
    if (invitation.status === "confirmed" && invitation.confirmation) {
      const idempotent = matchesConfirmation(invitation.confirmation, request, email.value);
      return {
        outcome: idempotent ? ("confirmed" as const) : ("already-confirmed" as const),
        idempotent,
        revision: invitation.revision,
        linkGeneration: invitation.linkGeneration,
      };
    }

    if (invitation.status !== "active") {
      return { outcome: "unavailable" as const };
    }
    if (
      invitation.linkGeneration !== args.expectedLinkGeneration ||
      invitation.revision !== args.expectedRevision
    ) {
      return {
        outcome: "stale" as const,
        revision: invitation.revision,
        linkGeneration: invitation.linkGeneration,
      };
    }

    const now = Date.now();
    const availableSlots = futureSlots(invitation.options, now);
    if (availableSlots.length === 0) {
      const revision = invitation.revision + 1;
      await ctx.db.patch(invitation._id, {
        status: "expired",
        expiredAt: now,
        revision,
        updatedAt: now,
      });
      await recordEvent(ctx, invitation._id, "expired", now);
      return { outcome: "expired" as const, revision };
    }

    const activationIssues = additionalActivationIssues(invitation.options, now);
    if (activationIssues.length > 0) {
      return { outcome: "invalid-invitation" as const, revision: invitation.revision };
    }

    const slot = availableSlots.find((candidate) => candidate.id === args.slotId);
    const activity = invitation.options.activities.find(
      (candidate) => candidate.id === args.activityId,
    );
    const place = activity?.places.find((candidate) => candidate.id === args.placeId);
    if (!slot) return { outcome: "invalid-selection" as const, field: "slot" as const };
    if (!activity) {
      return { outcome: "invalid-selection" as const, field: "activity" as const };
    }
    if (!place) return { outcome: "invalid-selection" as const, field: "place" as const };

    const color = args.colorId
      ? invitation.options.colorModule.presets.find((preset) => preset.id === args.colorId)
      : undefined;
    if (
      (invitation.options.colorModule.enabled && !color) ||
      (!invitation.options.colorModule.enabled && args.colorId !== undefined)
    ) {
      return { outcome: "invalid-selection" as const, field: "color" as const };
    }
    if (
      (invitation.options.transportEnabled && args.transport === undefined) ||
      (!invitation.options.transportEnabled && args.transport !== undefined)
    ) {
      return { outcome: "invalid-selection" as const, field: "transport" as const };
    }

    const confirmed = await ctx.db
      .query("invitations")
      .withIndex("by_status", (index) => index.eq("status", "confirmed"))
      .collect();
    if (
      confirmed.some(
        (other) =>
          other._id !== invitation._id &&
          other.confirmation !== undefined &&
          rangesOverlap(slot, other.confirmation.slot),
      )
    ) {
      return { outcome: "slot-conflict" as const };
    }

    const confirmation = {
      slot,
      planItems: [
        {
          order: 0,
          activity: {
            id: activity.id,
            catalogActivityId: activity.catalogActivityId,
            label: activity.label,
            description: activity.description,
            durationMinutes: activity.durationMinutes,
            timeTags: activity.timeTags,
          },
          place,
        },
      ],
      color,
      transport: args.transport,
      recipientEmail: email.value,
      confirmationKey,
      confirmedAt: now,
    };
    const revision = invitation.revision + 1;
    await ctx.db.patch(invitation._id, {
      status: "confirmed",
      confirmation,
      confirmedAt: now,
      revision,
      updatedAt: now,
    });
    await recordEvent(ctx, invitation._id, "confirmed", now);
    await ctx.scheduler.runAfter(0, internal.email.enqueueForEvent, {
      invitationId: invitation._id,
      eventType: "confirmation",
    });

    const activeInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_status", (index) => index.eq("status", "active"))
      .collect();
    let invalidatedInvitationCount = 0;
    for (const other of activeInvitations) {
      if (other._id === invitation._id) continue;
      const removedOverlap = other.options.slots.some((candidate) =>
        rangesOverlap(slot, candidate),
      );
      const retainedSlots = other.options.slots.filter(
        (candidate) =>
          candidate.startAt > now &&
          candidate.endAt > candidate.startAt &&
          !rangesOverlap(slot, candidate),
      );
      if (retainedSlots.length === other.options.slots.length) continue;

      const status = retainedSlots.length === 0 ? ("expired" as const) : ("active" as const);
      await ctx.db.patch(other._id, {
        status,
        options: { ...other.options, slots: retainedSlots },
        expiredAt: status === "expired" ? now : other.expiredAt,
        revision: other.revision + 1,
        updatedAt: now,
      });
      if (removedOverlap) {
        invalidatedInvitationCount += 1;
        await recordEvent(ctx, other._id, "overlap-pruned", now, "confirmed-overlap");
      }
      if (status === "expired") await recordEvent(ctx, other._id, "expired", now);
    }

    return {
      outcome: "confirmed" as const,
      idempotent: false,
      revision,
      linkGeneration: invitation.linkGeneration,
      invalidatedInvitationCount,
    };
  },
});
