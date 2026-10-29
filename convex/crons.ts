import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const expireInvitations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_status", (index) => index.eq("status", "active"))
      .take(100);

    let expired = 0;
    for (const invitation of activeInvitations) {
      if (invitation.options.slots.some((slot) => slot.startAt > now)) {
        continue;
      }
      await ctx.db.patch(invitation._id, {
        status: "expired",
        expiredAt: now,
        revision: invitation.revision + 1,
        updatedAt: now,
      });
      await ctx.db.insert("invitationEvents", {
        invitationId: invitation._id,
        type: "expired",
        reason: "all-slots-started",
        createdAt: now,
      });
      expired += 1;
    }
    return { expired };
  },
});

export const purgeRecipientEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [confirmed, cancelled] = await Promise.all([
      ctx.db
        .query("invitations")
        .withIndex("by_status", (index) => index.eq("status", "confirmed"))
        .take(50),
      ctx.db
        .query("invitations")
        .withIndex("by_status", (index) => index.eq("status", "cancelled"))
        .take(50),
    ]);

    let purged = 0;
    for (const invitation of [...confirmed, ...cancelled]) {
      const confirmation = invitation.confirmation;
      if (!confirmation?.recipientEmail) {
        continue;
      }

      const deliveries = await ctx.db
        .query("emailDeliveries")
        .withIndex("by_invitation", (index) =>
          index.eq("invitationId", invitation._id),
        )
        .collect();
      const cancellationDelivery = deliveries.find(
        (delivery) =>
          delivery.eventType === "cancellation" &&
          delivery.audience === "recipient",
      );
      const eventHasEnded = confirmation.slot.endAt <= now;
      const cancellationIsTerminal =
        invitation.status === "cancelled" &&
        cancellationDelivery !== undefined &&
        (cancellationDelivery.status === "delivered" ||
          cancellationDelivery.status === "failed");
      if (!eventHasEnded && !cancellationIsTerminal) {
        continue;
      }

      await ctx.db.patch(invitation._id, {
        confirmation: { ...confirmation, recipientEmail: undefined },
        updatedAt: now,
      });
      for (const delivery of deliveries) {
        if (delivery.audience !== "recipient" || !delivery.recipientEmail) {
          continue;
        }
        await ctx.db.patch(delivery._id, {
          recipientEmail: undefined,
          purgedAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.insert("invitationEvents", {
        invitationId: invitation._id,
        type: "email-purged",
        reason: eventHasEnded ? "event-ended" : "cancellation-delivery-terminal",
        createdAt: now,
      });
      purged += 1;
    }
    return { purged };
  },
});

const crons = cronJobs();

crons.interval(
  "expire invitations whose slots have started",
  { minutes: 1 },
  internal.crons.expireInvitations,
  {},
);
crons.interval(
  "recover due transactional email",
  { minutes: 1 },
  internal.email.recoverPending,
  {},
);
crons.interval(
  "purge retained recipient email",
  { hours: 1 },
  internal.crons.purgeRecipientEmails,
  {},
);

export default crons;
