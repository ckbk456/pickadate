import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner } from "./lib/owner";
import { timeTag } from "./validators";

const activityFields = {
  label: v.string(),
  description: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  timeTags: v.array(timeTag),
};

const placeFields = {
  name: v.string(),
  address: v.string(),
  mapsUrl: v.string(),
  note: v.optional(v.string()),
  activityIds: v.array(v.id("activities")),
  timeTags: v.array(timeTag),
  coverImageUrl: v.string(),
  galleryImageUrls: v.array(v.string()),
};

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const [activities, places] = await Promise.all([
      ctx.db.query("activities").collect(),
      ctx.db.query("places").collect(),
    ]);
    const includeArchived = args.includeArchived ?? false;
    return {
      activities: activities.filter((item) => includeArchived || !item.archivedAt),
      places: places.filter((item) => includeArchived || !item.archivedAt),
    };
  },
});

export const saveActivity = mutation({
  args: {
    id: v.optional(v.id("activities")),
    ...activityFields,
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const now = Date.now();
    const label = args.label.trim();
    if (!label || label.length > 100) {
      throw new ConvexError("Activity name is required and must be under 100 characters.");
    }
    if (args.durationMinutes !== undefined && (args.durationMinutes < 15 || args.durationMinutes > 720)) {
      throw new ConvexError("Duration must be between 15 minutes and 12 hours.");
    }

    const fields = {
      label,
      description: args.description?.trim() || undefined,
      durationMinutes: args.durationMinutes,
      timeTags: [...new Set(args.timeTags)],
      updatedAt: now,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new ConvexError("Activity not found.");
      await ctx.db.patch(args.id, fields);
      return args.id;
    }

    return await ctx.db.insert("activities", { ...fields, createdAt: now });
  },
});

export const setActivityArchived = mutation({
  args: { id: v.id("activities"), archived: v.boolean() },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Activity not found.");
    await ctx.db.patch(args.id, {
      archivedAt: args.archived ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

export const savePlace = mutation({
  args: {
    id: v.optional(v.id("places")),
    ...placeFields,
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const now = Date.now();
    const name = args.name.trim();
    if (!name || name.length > 120) {
      throw new ConvexError("Place name is required and must be under 120 characters.");
    }
    let mapsUrl: URL;
    try {
      mapsUrl = new URL(args.mapsUrl);
    } catch {
      throw new ConvexError("Enter a valid Google Maps URL.");
    }
    const allowedMapsHost = ["google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"].some(
      (host) => mapsUrl.hostname === host || mapsUrl.hostname.endsWith(`.${host}`),
    );
    if (mapsUrl.protocol !== "https:" || !allowedMapsHost) {
      throw new ConvexError("Only HTTPS Google Maps links are supported.");
    }

    for (const activityId of args.activityIds) {
      if (!(await ctx.db.get(activityId))) {
        throw new ConvexError("A selected activity no longer exists.");
      }
    }

    const fields = {
      name,
      address: args.address.trim(),
      mapsUrl: mapsUrl.toString(),
      note: args.note?.trim() || undefined,
      activityIds: [...new Set(args.activityIds)],
      timeTags: [...new Set(args.timeTags)],
      coverImageUrl: args.coverImageUrl,
      galleryImageUrls: args.galleryImageUrls,
      updatedAt: now,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new ConvexError("Place not found.");
      await ctx.db.patch(args.id, fields);
      return args.id;
    }

    return await ctx.db.insert("places", { ...fields, createdAt: now });
  },
});

export const setPlaceArchived = mutation({
  args: { id: v.id("places"), archived: v.boolean() },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Place not found.");
    await ctx.db.patch(args.id, {
      archivedAt: args.archived ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

export const seedStarterCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    await assertOwner(ctx);
    const existing = await ctx.db.query("activities").first();
    if (existing) return { created: false };

    const now = Date.now();
    const badmintonId = await ctx.db.insert("activities", {
      label: "Đánh cầu lông",
      description: "Vận động một chút rồi mình đi ăn gì đó nhé.",
      durationMinutes: 120,
      timeTags: ["morning", "afternoon", "night"],
      createdAt: now,
      updatedAt: now,
    });
    const iceCreamId = await ctx.db.insert("activities", {
      label: "Đi ăn kem",
      description: "Một buổi hẹn nhẹ nhàng với món ngọt.",
      durationMinutes: 60,
      timeTags: ["afternoon", "night"],
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all([
      ctx.db.insert("places", {
        name: "Sân cầu lông Kỳ Hòa",
        address: "238/2 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM",
        mapsUrl: "https://maps.google.com/?q=Kỳ+Hòa+Quận+10",
        note: "Sân rộng, ánh sáng đẹp vào buổi chiều.",
        activityIds: [badmintonId],
        timeTags: ["afternoon", "night"],
        coverImageUrl: "/images/places/badminton-ky-hoa.jpg",
        galleryImageUrls: [],
        createdAt: now,
        updatedAt: now,
      }),
      ctx.db.insert("places", {
        name: "Sân cầu lông Nguyễn Du",
        address: "116 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM",
        mapsUrl: "https://maps.google.com/?q=116+Nguyễn+Du+Quận+1",
        note: "Không gian yên tĩnh, hợp buổi sáng hoặc chiều.",
        activityIds: [badmintonId],
        timeTags: ["morning", "afternoon"],
        coverImageUrl: "/images/places/badminton-nguyen-du.jpg",
        galleryImageUrls: [],
        createdAt: now,
        updatedAt: now,
      }),
      ctx.db.insert("places", {
        name: "Tiệm kem Mơ",
        address: "42 Trần Cao Vân, Phường Võ Thị Sáu, Quận 3, TP.HCM",
        mapsUrl: "https://maps.google.com/?q=42+Trần+Cao+Vân+Quận+3",
        note: "Tông màu ấm, nhiều ánh sáng và khá riêng tư.",
        activityIds: [iceCreamId],
        timeTags: ["afternoon", "night"],
        coverImageUrl: "/images/places/ice-cream-pastel.jpg",
        galleryImageUrls: [],
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    return { created: true };
  },
});
