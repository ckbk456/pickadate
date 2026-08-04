import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { assertOwner } from "./lib/owner";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_VARIANT_BYTES = 5 * 1024 * 1024;
const MAX_ALT_LENGTH = 180;
const MAX_WIDTH_BY_PURPOSE = {
  thumbnail: 480,
  card: 1_200,
  detail: 2_400,
} as const;

const sourceContentTypes = new Set([
  "image/avif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const variant = v.object({
  format: v.union(v.literal("avif"), v.literal("webp")),
  purpose: v.union(
    v.literal("thumbnail"),
    v.literal("card"),
    v.literal("detail"),
  ),
  width: v.number(),
  height: v.number(),
  storageId: v.id("_storage"),
});

type Variant = {
  format: "avif" | "webp";
  purpose: "thumbnail" | "card" | "detail";
  width: number;
  height: number;
  storageId: Id<"_storage">;
};

const requiredVariantKeys = new Set([
  "thumbnail:avif",
  "thumbnail:webp",
  "card:avif",
  "card:webp",
  "detail:avif",
  "detail:webp",
]);

export function validateDimensions(variants: Omit<Variant, "storageId">[]): void {
  const dimensions = new Map<string, { width: number; height: number }>();

  for (const item of variants) {
    if (
      !Number.isInteger(item.width) ||
      !Number.isInteger(item.height) ||
      item.width < 1 ||
      item.height < 1 ||
      item.width > MAX_WIDTH_BY_PURPOSE[item.purpose] ||
      item.height > MAX_WIDTH_BY_PURPOSE[item.purpose]
    ) {
      throw new ConvexError("Media variant dimensions are invalid.");
    }

    const prior = dimensions.get(item.purpose);
    if (prior && (prior.width !== item.width || prior.height !== item.height)) {
      throw new ConvexError("AVIF and WebP variants must have matching dimensions.");
    }
    dimensions.set(item.purpose, { width: item.width, height: item.height });
  }

  const thumbnail = dimensions.get("thumbnail");
  const card = dimensions.get("card");
  const detail = dimensions.get("detail");
  if (!thumbnail || !card || !detail) {
    throw new ConvexError("The responsive media set is incomplete.");
  }
  if (
    thumbnail.width > card.width ||
    thumbnail.height > card.height ||
    card.width > detail.width ||
    card.height > detail.height
  ) {
    throw new ConvexError("Media variants must increase from thumbnail to detail.");
  }

  const detailRatio = detail.width / detail.height;
  for (const value of dimensions.values()) {
    if (Math.abs(value.width / value.height - detailRatio) > 0.01) {
      throw new ConvexError("All media variants must preserve one aspect ratio.");
    }
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertOwner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const beginUpload = mutation({
  args: {
    sourceStorageId: v.id("_storage"),
    alt: v.string(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const alt = args.alt.trim();
    if (!alt || alt.length > MAX_ALT_LENGTH) {
      throw new ConvexError(`Alt text must be between 1 and ${MAX_ALT_LENGTH} characters.`);
    }

    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_source_storage_id", (index) =>
        index.eq("sourceStorageId", args.sourceStorageId),
      )
      .first();
    if (existing) {
      return existing._id;
    }

    const metadata = await ctx.db.system.get("_storage", args.sourceStorageId);
    if (!metadata) {
      throw new ConvexError("The uploaded source image no longer exists.");
    }
    if (
      !metadata.contentType ||
      !sourceContentTypes.has(metadata.contentType.toLocaleLowerCase("en-US"))
    ) {
      throw new ConvexError("Upload a supported image file.");
    }
    if (metadata.size < 1 || metadata.size > MAX_SOURCE_BYTES) {
      throw new ConvexError("The source image exceeds the configured upload limit.");
    }

    const now = Date.now();
    return await ctx.db.insert("mediaAssets", {
      state: "processing",
      revision: `source-${args.sourceStorageId}`,
      alt,
      width: 0,
      height: 0,
      sourceStorageId: args.sourceStorageId,
      variants: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

type PublishArgs = {
  mediaAssetId: Id<"mediaAssets">;
  variants: Variant[];
};

async function publishVariants(ctx: MutationCtx, args: PublishArgs) {
    const asset = await ctx.db.get(args.mediaAssetId);
    if (!asset) {
      throw new ConvexError("Media asset not found.");
    }
    if (asset.state === "ready") {
      return args.mediaAssetId;
    }
    if (asset.state !== "processing" || !asset.sourceStorageId) {
      throw new ConvexError("Only a processing media asset can be published.");
    }

    const keys = args.variants.map((item) => `${item.purpose}:${item.format}`);
    if (
      keys.length !== requiredVariantKeys.size ||
      new Set(keys).size !== requiredVariantKeys.size ||
      keys.some((key) => !requiredVariantKeys.has(key))
    ) {
      throw new ConvexError("Register exactly one AVIF and WebP file for every purpose.");
    }
    if (new Set(args.variants.map((item) => item.storageId)).size !== args.variants.length) {
      throw new ConvexError("Each responsive variant must use a distinct stored file.");
    }
    if (args.variants.some((item) => item.storageId === asset.sourceStorageId)) {
      throw new ConvexError("The temporary source cannot be published as a responsive variant.");
    }

    validateDimensions(args.variants);
    for (const item of args.variants) {
      const metadata = await ctx.db.system.get("_storage", item.storageId);
      if (!metadata) {
        throw new ConvexError("A responsive media variant no longer exists.");
      }
      if (metadata.contentType?.toLocaleLowerCase("en-US") !== `image/${item.format}`) {
        throw new ConvexError("A responsive media variant has the wrong file format.");
      }
      if (metadata.size < 1 || metadata.size > MAX_VARIANT_BYTES) {
        throw new ConvexError("A responsive media variant exceeds the configured size limit.");
      }
    }

    const detail = args.variants.find(
      (item) => item.purpose === "detail" && item.format === "avif",
    );
    if (!detail) {
      throw new ConvexError("The detail AVIF variant is required.");
    }

    const now = Date.now();
    await ctx.storage.delete(asset.sourceStorageId);
    await ctx.db.patch(args.mediaAssetId, {
      state: "ready",
      width: detail.width,
      height: detail.height,
      sourceStorageId: undefined,
      variants: args.variants,
      error: undefined,
      publishedAt: now,
      failedAt: undefined,
      updatedAt: now,
    });
    return args.mediaAssetId;
}

export const registerVariants = mutation({
  args: {
    mediaAssetId: v.id("mediaAssets"),
    variants: v.array(variant),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    return await publishVariants(ctx, args);
  },
});

export const registerVariantsInternal = internalMutation({
  args: {
    mediaAssetId: v.id("mediaAssets"),
    variants: v.array(variant),
  },
  handler: publishVariants,
});

export const getProcessingSource = internalQuery({
  args: { mediaAssetId: v.id("mediaAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.mediaAssetId);
    if (!asset || asset.state !== "processing" || !asset.sourceStorageId) {
      return null;
    }
    return { sourceStorageId: asset.sourceStorageId, alt: asset.alt };
  },
});

export const markProcessingFailedInternal = internalMutation({
  args: {
    mediaAssetId: v.id("mediaAssets"),
    error: v.union(
      v.literal("decode-failed"),
      v.literal("invalid-source"),
      v.literal("upload-interrupted"),
      v.literal("variant-generation-failed"),
    ),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.mediaAssetId);
    if (!asset || asset.state !== "processing") return;
    if (asset.sourceStorageId) await ctx.storage.delete(asset.sourceStorageId);
    const now = Date.now();
    await ctx.db.patch(asset._id, {
      state: "failed",
      sourceStorageId: undefined,
      error: args.error,
      failedAt: now,
      updatedAt: now,
    });
  },
});

export const markProcessingFailed = mutation({
  args: {
    mediaAssetId: v.id("mediaAssets"),
    error: v.union(
      v.literal("decode-failed"),
      v.literal("invalid-source"),
      v.literal("upload-interrupted"),
      v.literal("variant-generation-failed"),
    ),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const asset = await ctx.db.get(args.mediaAssetId);
    if (!asset) {
      throw new ConvexError("Media asset not found.");
    }
    if (asset.state !== "processing") {
      return;
    }

    if (asset.sourceStorageId) {
      await ctx.storage.delete(asset.sourceStorageId);
    }
    const now = Date.now();
    await ctx.db.patch(args.mediaAssetId, {
      state: "failed",
      sourceStorageId: undefined,
      error: args.error,
      failedAt: now,
      updatedAt: now,
    });
  },
});

export const discardUnregisteredUploads = mutation({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const storageIds = [...new Set(args.storageIds)];
    if (storageIds.length < 1 || storageIds.length > 12) {
      throw new ConvexError("Discard between 1 and 12 uploaded files at a time.");
    }

    const protectedIds = new Set<string>();
    for (const asset of await ctx.db.query("mediaAssets").collect()) {
      if (asset.sourceStorageId) {
        protectedIds.add(asset.sourceStorageId);
      }
      for (const item of asset.variants) {
        protectedIds.add(item.storageId);
      }
    }
    if (storageIds.some((storageId) => protectedIds.has(storageId))) {
      throw new ConvexError("A registered media file cannot be discarded.");
    }

    let discarded = 0;
    for (const storageId of storageIds) {
      if (await ctx.db.system.get("_storage", storageId)) {
        await ctx.storage.delete(storageId);
        discarded += 1;
      }
    }
    return { discarded };
  },
});

export const getAsset = query({
  args: { mediaAssetId: v.id("mediaAssets") },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const asset = await ctx.db.get(args.mediaAssetId);
    if (!asset) {
      return null;
    }
    if (asset.state !== "ready") {
      return {
        id: asset._id,
        state: asset.state,
        revision: asset.revision,
        alt: asset.alt,
        error: asset.error,
        sourceUrl: asset.sourceStorageId
          ? await ctx.storage.getUrl(asset.sourceStorageId)
          : undefined,
      };
    }

    return {
      id: asset._id,
      state: asset.state,
      revision: asset.revision,
      alt: asset.alt,
      width: asset.width,
      height: asset.height,
      variants: await Promise.all(
        asset.variants.map(async (item) => ({
          ...item,
          url: await ctx.storage.getUrl(item.storageId),
        })),
      ),
    };
  },
});
