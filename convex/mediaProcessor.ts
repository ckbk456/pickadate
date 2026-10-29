"use node";

import sharp from "sharp";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { assertOwner } from "./lib/owner";

const PURPOSES = [
  { purpose: "thumbnail" as const, width: 480 },
  { purpose: "card" as const, width: 1200 },
  { purpose: "detail" as const, width: 2400 },
];

type ProcessingSource = {
  sourceStorageId: Id<"_storage">;
  alt: string;
};

type ProcessedVariant = {
  format: "avif" | "webp";
  purpose: "thumbnail" | "card" | "detail";
  width: number;
  height: number;
  storageId: Id<"_storage">;
  url: string | null;
};

export const processAsset = action({
  args: { mediaAssetId: v.id("mediaAssets") },
  handler: async (ctx, args): Promise<{ state: "ready"; variants: ProcessedVariant[] }> => {
    await assertOwner(ctx);
    const source = (await ctx.runQuery(
      internal.media.getProcessingSource,
      args,
    )) as ProcessingSource | null;
    if (!source) throw new Error("The temporary media source is unavailable.");

    const uploaded: Id<"_storage">[] = [];
    try {
      const sourceBlob = await ctx.storage.get(source.sourceStorageId);
      if (!sourceBlob) throw new Error("source-download-failed");
      const oriented = sharp(Buffer.from(await sourceBlob.arrayBuffer()), {
        failOn: "warning",
        limitInputPixels: 40_000_000,
      }).rotate();
      const metadata = await oriented.metadata();
      if (!metadata.width || !metadata.height) throw new Error("source-dimensions-missing");

      const variants = [];
      for (const target of PURPOSES) {
        const width = Math.min(target.width, metadata.width);
        const base = oriented.clone().resize({ width, withoutEnlargement: true });
        const avif = await base.clone().avif({ quality: 62, effort: 5 }).toBuffer({ resolveWithObject: true });
        const webp = await base.clone().webp({ quality: 76, effort: 5 }).toBuffer({ resolveWithObject: true });
        const avifStorageId = await ctx.storage.store(
          new Blob([new Uint8Array(avif.data)], { type: "image/avif" }),
        );
        uploaded.push(avifStorageId);
        const webpStorageId = await ctx.storage.store(
          new Blob([new Uint8Array(webp.data)], { type: "image/webp" }),
        );
        uploaded.push(webpStorageId);
        variants.push(
          { format: "avif" as const, purpose: target.purpose, width: avif.info.width, height: avif.info.height, storageId: avifStorageId },
          { format: "webp" as const, purpose: target.purpose, width: webp.info.width, height: webp.info.height, storageId: webpStorageId },
        );
      }

      await ctx.runMutation(internal.media.registerVariantsInternal, {
        mediaAssetId: args.mediaAssetId,
        variants,
      });
      return {
        state: "ready" as const,
        variants: await Promise.all(
          variants.map(async (item) => ({
            ...item,
            url: await ctx.storage.getUrl(item.storageId),
          })),
        ),
      };
    } catch (error) {
      for (const storageId of uploaded) {
        await ctx.storage.delete(storageId).catch(() => undefined);
      }
      await ctx.runMutation(internal.media.markProcessingFailedInternal, {
        mediaAssetId: args.mediaAssetId,
        error: "variant-generation-failed",
      });
      throw error;
    }
  },
});
