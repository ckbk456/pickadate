import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner } from "./lib/owner";

export const getAccessState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { state: "signed-out" as const };

    const configuredEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    if (!configuredEmail) return { state: "misconfigured" as const };

    const email = identity.email?.trim().toLowerCase();
    if (!email || identity.emailVerified !== true) {
      return { state: "unverified" as const };
    }
    if (email !== configuredEmail) {
      return { state: "forbidden" as const };
    }
    return { state: "owner" as const, email };
  },
});

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const owner = await assertOwner(ctx);
    return await ctx.db
      .query("ownerSettings")
      .withIndex("by_email", (index) => index.eq("normalizedEmail", owner.email))
      .unique();
  },
});

export const saveSettings = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await assertOwner(ctx);
    const displayName = args.displayName.trim();
    if (displayName.length < 1 || displayName.length > 80) {
      throw new Error("Display name must be between 1 and 80 characters.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("ownerSettings")
      .withIndex("by_email", (index) => index.eq("normalizedEmail", owner.email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { displayName, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("ownerSettings", {
      normalizedEmail: owner.email,
      displayName,
      timezone: "Asia/Ho_Chi_Minh",
      createdAt: now,
      updatedAt: now,
    });
  },
});
