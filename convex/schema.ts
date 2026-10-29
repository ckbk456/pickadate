import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  confirmation,
  invitationOptions,
  invitationStatus,
  timeTag,
} from "./validators";

export default defineSchema({
  ...authTables,
  ownerSettings: defineTable({
    normalizedEmail: v.string(),
    displayName: v.string(),
    timezone: v.literal("Asia/Ho_Chi_Minh"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["normalizedEmail"]),
  activities: defineTable({
    label: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    timeTags: v.array(timeTag),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_archived", ["archivedAt"]),
  places: defineTable({
    name: v.string(),
    address: v.string(),
    mapsUrl: v.string(),
    note: v.optional(v.string()),
    activityIds: v.array(v.id("activities")),
    timeTags: v.array(timeTag),
    coverImageUrl: v.string(),
    galleryImageUrls: v.array(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_archived", ["archivedAt"]),
  mediaAssets: defineTable({
    state: v.union(v.literal("processing"), v.literal("ready"), v.literal("failed")),
    revision: v.string(),
    alt: v.string(),
    width: v.number(),
    height: v.number(),
    sourceStorageId: v.optional(v.id("_storage")),
    variants: v.array(
      v.object({
        format: v.union(v.literal("avif"), v.literal("webp")),
        purpose: v.union(
          v.literal("thumbnail"),
          v.literal("card"),
          v.literal("detail"),
        ),
        width: v.number(),
        height: v.number(),
        storageId: v.id("_storage"),
      }),
    ),
    error: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_source_storage_id", ["sourceStorageId"]),
  invitations: defineTable({
    publicToken: v.optional(v.string()),
    linkDigest: v.optional(v.string()),
    linkGeneration: v.number(),
    revision: v.number(),
    status: invitationStatus,
    options: invitationOptions,
    confirmation: v.optional(confirmation),
    activatedAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    expiredAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_link_digest", ["linkDigest"])
    .index("by_status", ["status"])
    .index("by_archived", ["archivedAt"]),
  emailDeliveries: defineTable({
    invitationId: v.id("invitations"),
    eventType: v.union(v.literal("confirmation"), v.literal("cancellation")),
    audience: v.union(v.literal("owner"), v.literal("recipient")),
    recipientEmail: v.optional(v.string()),
    idempotencyKey: v.string(),
    templateVersion: v.string(),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    attemptCount: v.number(),
    nextAttemptAt: v.optional(v.number()),
    inFlightAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    purgedAt: v.optional(v.number()),
    providerId: v.optional(v.string()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_invitation", ["invitationId"])
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_status_next_attempt", ["status", "nextAttemptAt"]),
  invitationEvents: defineTable({
    invitationId: v.id("invitations"),
    type: v.union(
      v.literal("created"),
      v.literal("activated"),
      v.literal("confirmed"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("reopened"),
      v.literal("archived"),
      v.literal("unarchived"),
      v.literal("overlap-pruned"),
      v.literal("link-rotated"),
      v.literal("email-delivered"),
      v.literal("email-failed"),
      v.literal("email-purged"),
      v.literal("erased"),
    ),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_invitation", ["invitationId"]),
  invitationTombstones: defineTable({
    invitationId: v.string(),
    revokedLinkDigest: v.optional(v.string()),
    lastLinkGeneration: v.number(),
    erasedAt: v.number(),
  })
    .index("by_invitation_id", ["invitationId"])
    .index("by_link_digest", ["revokedLinkDigest"]),
});
