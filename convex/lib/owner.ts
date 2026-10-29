import { ConvexError } from "convex/values";
import type { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type OwnerContext =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>
  | GenericActionCtx<DataModel>;

export function normalizeOwnerEmail(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

export async function assertOwner(ctx: OwnerContext) {
  const identity = await ctx.auth.getUserIdentity();
  const configuredEmail = process.env.OWNER_EMAIL;

  if (!identity || !identity.email) {
    throw new ConvexError("Not authenticated");
  }
  if (identity.emailVerified !== true) {
    throw new ConvexError("A verified Google email is required");
  }
  if (!configuredEmail) {
    throw new ConvexError("OWNER_EMAIL is not configured");
  }

  const email = normalizeOwnerEmail(identity.email);
  if (email !== normalizeOwnerEmail(configuredEmail)) {
    throw new ConvexError("Not authorized");
  }

  return { email, identity };
}
