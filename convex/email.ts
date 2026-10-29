import { Resend, type ErrorResponse } from "resend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { assertOwner } from "./lib/owner";

const TEMPLATE_VERSION = "transactional-v1";
const MAX_ATTEMPTS = 4;
const IN_FLIGHT_LEASE_MS = 10 * 60_000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000] as const;

type DeliveryEvent = "confirmation" | "cancellation";
type DeliveryAudience = "owner" | "recipient";
type Confirmation = NonNullable<Doc<"invitations">["confirmation"]>;

type PreparedDelivery = {
  deliveryId: Id<"emailDeliveries">;
  invitationId: Id<"invitations">;
  eventType: DeliveryEvent;
  audience: DeliveryAudience;
  attemptNumber: number;
  to: string;
  idempotencyKey: string;
  recipientName: string;
  ownerName: string;
  publicToken: string;
  slug: string;
  confirmation: Confirmation;
};

function deliveryKey(
  invitationId: Id<"invitations">,
  eventType: DeliveryEvent,
  audience: DeliveryAudience,
): string {
  return `pick-a-date:${invitationId}:${eventType}:${audience}:${TEMPLATE_VERSION}`;
}

function normalizeEmail(value: string | undefined): string | undefined {
  const normalized = value?.trim().normalize("NFKC").toLocaleLowerCase("en-US");
  return normalized || undefined;
}

function sanitizeFailureCode(value: string): string {
  const normalized = value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9:_-]/gu, "-")
    .slice(0, 100);
  return normalized || "email:unknown-error";
}

async function markTerminalFailure(
  ctx: MutationCtx,
  delivery: Doc<"emailDeliveries">,
  code: string,
): Promise<void> {
  if (delivery.status !== "pending") {
    return;
  }
  const now = Date.now();
  const sanitizedCode = sanitizeFailureCode(code);
  await ctx.db.patch(delivery._id, {
    status: "failed",
    nextAttemptAt: undefined,
    inFlightAt: undefined,
    completedAt: now,
    lastError: sanitizedCode,
    updatedAt: now,
  });

  if (await ctx.db.get(delivery.invitationId)) {
    await ctx.db.insert("invitationEvents", {
      invitationId: delivery.invitationId,
      type: "email-failed",
      reason: `${delivery.eventType}:${delivery.audience}:${sanitizedCode}`,
      createdAt: now,
    });
  }
}

export const enqueueForEvent = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    eventType: v.union(v.literal("confirmation"), v.literal("cancellation")),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation?.confirmation) {
      return [];
    }
    if (args.eventType === "confirmation" && invitation.status !== "confirmed") {
      return [];
    }
    if (args.eventType === "cancellation" && invitation.status !== "cancelled") {
      return [];
    }

    const recipientEmail = normalizeEmail(invitation.confirmation.recipientEmail);
    const targets: Array<{ audience: DeliveryAudience; email?: string }> =
      args.eventType === "confirmation"
        ? [
            {
              audience: "owner",
              email:
                normalizeEmail(process.env.OWNER_NOTIFICATION_EMAIL) ??
                normalizeEmail(process.env.OWNER_EMAIL),
            },
            ...(recipientEmail
              ? [{ audience: "recipient" as const, email: recipientEmail }]
              : []),
          ]
        : recipientEmail
          ? [{ audience: "recipient", email: recipientEmail }]
          : [];

    const deliveryIds: Id<"emailDeliveries">[] = [];
    for (const target of targets) {
      const idempotencyKey = deliveryKey(
        args.invitationId,
        args.eventType,
        target.audience,
      );
      const existing = await ctx.db
        .query("emailDeliveries")
        .withIndex("by_idempotency", (index) =>
          index.eq("idempotencyKey", idempotencyKey),
        )
        .first();
      if (existing) {
        deliveryIds.push(existing._id);
        continue;
      }

      const now = Date.now();
      const deliveryId = await ctx.db.insert("emailDeliveries", {
        invitationId: args.invitationId,
        eventType: args.eventType,
        audience: target.audience,
        recipientEmail: target.email,
        idempotencyKey,
        templateVersion: TEMPLATE_VERSION,
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.email.sendDelivery, { deliveryId });
      deliveryIds.push(deliveryId);
    }
    return deliveryIds;
  },
});

export const beginAttempt = internalMutation({
  args: { deliveryId: v.id("emailDeliveries") },
  handler: async (ctx, args): Promise<PreparedDelivery | null> => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.status !== "pending") {
      return null;
    }

    const now = Date.now();
    if (delivery.nextAttemptAt !== undefined && delivery.nextAttemptAt > now) {
      return null;
    }
    if (
      delivery.inFlightAt !== undefined &&
      now - delivery.inFlightAt < IN_FLIGHT_LEASE_MS
    ) {
      return null;
    }
    if (delivery.attemptCount >= MAX_ATTEMPTS) {
      await markTerminalFailure(ctx, delivery, "email:max-attempts-exhausted");
      return null;
    }

    const invitation = await ctx.db.get(delivery.invitationId);
    const expectedStatus =
      delivery.eventType === "confirmation" ? "confirmed" : "cancelled";
    if (!invitation?.confirmation || invitation.status !== expectedStatus) {
      await markTerminalFailure(ctx, delivery, "email:event-superseded");
      return null;
    }
    if (!invitation.publicToken) {
      await markTerminalFailure(ctx, delivery, "email:link-unavailable");
      return null;
    }

    const to =
      delivery.audience === "owner"
        ? delivery.recipientEmail ??
          normalizeEmail(process.env.OWNER_NOTIFICATION_EMAIL) ??
          normalizeEmail(process.env.OWNER_EMAIL)
        : delivery.recipientEmail;
    if (!to) {
      await markTerminalFailure(ctx, delivery, "email:recipient-unavailable");
      return null;
    }

    const ownerSettings = await ctx.db.query("ownerSettings").first();
    if (!ownerSettings) {
      await markTerminalFailure(ctx, delivery, "email:owner-settings-missing");
      return null;
    }

    const attemptNumber = delivery.attemptCount + 1;
    await ctx.db.patch(delivery._id, {
      attemptCount: attemptNumber,
      inFlightAt: now,
      nextAttemptAt: now,
      lastError: undefined,
      updatedAt: now,
    });

    return {
      deliveryId: delivery._id,
      invitationId: invitation._id,
      eventType: delivery.eventType,
      audience: delivery.audience,
      attemptNumber,
      to,
      idempotencyKey: delivery.idempotencyKey,
      recipientName: invitation.options.recipientName,
      ownerName: ownerSettings.displayName,
      publicToken: invitation.publicToken,
      slug: invitation.options.slug,
      confirmation: invitation.confirmation,
    };
  },
});

export const recordDelivered = internalMutation({
  args: {
    deliveryId: v.id("emailDeliveries"),
    attemptNumber: v.number(),
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      delivery.status !== "pending" ||
      delivery.attemptCount !== args.attemptNumber
    ) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(delivery._id, {
      status: "delivered",
      providerId: args.providerId.slice(0, 200),
      nextAttemptAt: undefined,
      inFlightAt: undefined,
      completedAt: now,
      lastError: undefined,
      updatedAt: now,
    });
    if (await ctx.db.get(delivery.invitationId)) {
      await ctx.db.insert("invitationEvents", {
        invitationId: delivery.invitationId,
        type: "email-delivered",
        reason: `${delivery.eventType}:${delivery.audience}:${delivery.templateVersion}`,
        createdAt: now,
      });
    }
    return null;
  },
});

export const recordFailure = internalMutation({
  args: {
    deliveryId: v.id("emailDeliveries"),
    attemptNumber: v.number(),
    code: v.string(),
    retryable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      delivery.status !== "pending" ||
      delivery.attemptCount !== args.attemptNumber
    ) {
      return null;
    }

    const code = sanitizeFailureCode(args.code);
    if (!args.retryable || delivery.attemptCount >= MAX_ATTEMPTS) {
      await markTerminalFailure(ctx, delivery, code);
      return null;
    }

    const delay = RETRY_DELAYS_MS[delivery.attemptCount - 1] ?? 30 * 60_000;
    const now = Date.now();
    await ctx.db.patch(delivery._id, {
      nextAttemptAt: now + delay,
      inFlightAt: undefined,
      lastError: code,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(delay, internal.email.sendDelivery, {
      deliveryId: delivery._id,
    });
    return null;
  },
});

export const recoverPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("emailDeliveries")
      .withIndex("by_status_next_attempt", (index) =>
        index.eq("status", "pending").lte("nextAttemptAt", now),
      )
      .take(25);

    let scheduled = 0;
    for (const delivery of pending) {
      if (
        delivery.inFlightAt !== undefined &&
        now - delivery.inFlightAt < IN_FLIGHT_LEASE_MS
      ) {
        continue;
      }
      await ctx.scheduler.runAfter(0, internal.email.sendDelivery, {
        deliveryId: delivery._id,
      });
      scheduled += 1;
    }
    return { scheduled };
  },
});

export const listForInvitation = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    return (await ctx.db
      .query("emailDeliveries")
      .withIndex("by_invitation", (index) => index.eq("invitationId", args.invitationId))
      .collect())
      .sort((left, right) => left.createdAt - right.createdAt)
      .map((delivery) => ({
        id: delivery._id,
        eventType: delivery.eventType,
        audience: delivery.audience,
        status: delivery.status,
        attemptCount: delivery.attemptCount,
        lastError: delivery.lastError,
        completedAt: delivery.completedAt,
        purgedAt: delivery.purgedAt,
      }));
  },
});

export const retryDelivery = mutation({
  args: { deliveryId: v.id("emailDeliveries") },
  handler: async (ctx, args) => {
    await assertOwner(ctx);
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) throw new Error("Email delivery not found.");
    if (delivery.status !== "failed") {
      return { scheduled: false as const, status: delivery.status };
    }
    const now = Date.now();
    await ctx.db.patch(delivery._id, {
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: now,
      inFlightAt: undefined,
      completedAt: undefined,
      lastError: undefined,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.email.sendDelivery, {
      deliveryId: delivery._id,
    });
    return { scheduled: true as const, status: "pending" as const };
  },
});

export const sendDelivery = internalAction({
  args: { deliveryId: v.id("emailDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.runMutation(internal.email.beginAttempt, args);
    if (!delivery) {
      return null;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const siteUrl = process.env.SITE_URL;
    if (!apiKey || !from || !siteUrl) {
      await ctx.runMutation(internal.email.recordFailure, {
        deliveryId: delivery.deliveryId,
        attemptNumber: delivery.attemptNumber,
        code: "config:email-environment-missing",
        retryable: false,
      });
      return null;
    }

    let content: ReturnType<typeof composeEmail>;
    try {
      content = composeEmail(delivery, siteUrl);
    } catch {
      await ctx.runMutation(internal.email.recordFailure, {
        deliveryId: delivery.deliveryId,
        attemptNumber: delivery.attemptNumber,
        code: "config:invalid-site-url",
        retryable: false,
      });
      return null;
    }

    try {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send(
        {
          from,
          to: delivery.to,
          subject: content.subject,
          text: content.text,
          html: content.html,
        },
        { idempotencyKey: delivery.idempotencyKey },
      );

      if (result.error) {
        const failure = classifyProviderFailure(result.error);
        await ctx.runMutation(internal.email.recordFailure, {
          deliveryId: delivery.deliveryId,
          attemptNumber: delivery.attemptNumber,
          ...failure,
        });
        return null;
      }

      await ctx.runMutation(internal.email.recordDelivered, {
        deliveryId: delivery.deliveryId,
        attemptNumber: delivery.attemptNumber,
        providerId: result.data.id,
      });
    } catch {
      await ctx.runMutation(internal.email.recordFailure, {
        deliveryId: delivery.deliveryId,
        attemptNumber: delivery.attemptNumber,
        code: "resend:network-error",
        retryable: true,
      });
    }
    return null;
  },
});

function classifyProviderFailure(error: ErrorResponse): {
  code: string;
  retryable: boolean;
} {
  const status = error.statusCode;
  return {
    code: `resend:${error.name}`,
    retryable:
      status === null ||
      status === 408 ||
      status === 409 ||
      status === 425 ||
      status === 429 ||
      status >= 500,
  };
}

function composeEmail(
  delivery: PreparedDelivery,
  configuredSiteUrl: string,
): { subject: string; text: string; html: string } {
  const siteUrl = new URL(configuredSiteUrl);
  if (siteUrl.protocol !== "https:" && siteUrl.protocol !== "http:") {
    throw new Error("Unsupported site URL.");
  }

  const invitationPath = delivery.slug
    ? `/i/${encodeURIComponent(delivery.publicToken)}/${encodeURIComponent(delivery.slug)}`
    : `/i/${encodeURIComponent(delivery.publicToken)}`;
  const invitationUrl = new URL(invitationPath, siteUrl).toString();
  const calendarUrl = buildCalendarUrl(delivery, invitationUrl);
  const planItem = delivery.confirmation.planItems[0];
  if (!planItem) {
    throw new Error("A confirmed invitation requires a plan item.");
  }

  const isRecipient = delivery.audience === "recipient";
  const isCancellation = delivery.eventType === "cancellation";
  const when = formatEventTime(
    delivery.confirmation.slot.startAt,
    delivery.confirmation.slot.endAt,
    isRecipient ? "vi-VN" : "en-GB",
  );
  const subject = isCancellation
    ? `Kế hoạch với ${delivery.ownerName} đã được huỷ`
    : isRecipient
      ? `Kèo với ${delivery.ownerName} đã chốt`
      : `Date confirmed with ${delivery.recipientName}`;

  const intro = isCancellation
    ? `Kế hoạch với ${delivery.ownerName} đã được huỷ. Hai bạn có thể trao đổi trực tiếp để sắp xếp lại nhé.`
    : isRecipient
      ? `Vậy là mình chốt nhé — dưới đây là kế hoạch của bạn với ${delivery.ownerName}.`
      : `${delivery.recipientName} confirmed the invitation.`;
  const details = [
    when,
    `${planItem.activity.label} · ${planItem.place.name}`,
    planItem.place.address,
    delivery.confirmation.color
      ? `${isRecipient ? "Màu trang phục" : "Outfit color"}: ${delivery.confirmation.color.label}`
      : null,
    delivery.confirmation.transport
      ? `${isRecipient ? "Di chuyển" : "Transport"}: ${transportLabel(
          delivery.confirmation.transport,
          isRecipient,
        )}`
      : null,
  ].filter((line): line is string => line !== null);

  const text = [
    intro,
    "",
    ...details,
    "",
    isCancellation ? `Xem lại: ${invitationUrl}` : `Thêm vào Google Calendar: ${calendarUrl}`,
    !isCancellation ? `Xem lời mời: ${invitationUrl}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const detailHtml = details
    .map((line) => `<li style="margin:0 0 8px">${escapeHtml(line)}</li>`)
    .join("");
  const primaryLink = isCancellation ? invitationUrl : calendarUrl;
  const primaryLabel = isCancellation
    ? "Xem lại kế hoạch"
    : isRecipient
      ? "Thêm vào Google Calendar"
      : "Add to Google Calendar";
  const html = `<!doctype html>
<html lang="${isRecipient ? "vi" : "en"}">
  <body style="margin:0;background:#f7f1e8;color:#28231f;font-family:Arial,sans-serif">
    <main style="max-width:560px;margin:0 auto;padding:36px 24px">
      <p style="font-size:18px;line-height:1.55;margin:0 0 24px">${escapeHtml(intro)}</p>
      <ul style="padding:20px 20px 12px 38px;margin:0 0 24px;background:#fffaf3;border:1px solid #e5d5c4;border-radius:16px">${detailHtml}</ul>
      <p style="margin:0 0 20px">
        <a href="${escapeHtml(primaryLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#9f5f49;color:#ffffff;text-decoration:none;font-weight:700">${escapeHtml(primaryLabel)}</a>
      </p>
      <p style="font-size:13px;line-height:1.5;margin:0;color:#70665f">${
        isCancellation
          ? "Email này chỉ thông báo thay đổi của lời mời."
          : `<a href="${escapeHtml(invitationUrl)}" style="color:#70665f">${
              isRecipient ? "Xem lời mời" : "View invitation"
            }</a>`
      }</p>
    </main>
  </body>
</html>`;

  return { subject, text, html };
}

function formatEventTime(startAt: number, endAt: number, locale: string): string {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const startDate = dateFormatter.format(startAt);
  const endDate = dateFormatter.format(endAt);
  return startDate === endDate
    ? `${startDate} · ${time.format(startAt)}–${time.format(endAt)}`
    : `${startDate} · ${time.format(startAt)} – ${endDate} · ${time.format(endAt)}`;
}

function buildCalendarUrl(
  delivery: PreparedDelivery,
  invitationUrl: string,
): string {
  const item = delivery.confirmation.planItems[0];
  if (!item) {
    throw new Error("A calendar event requires one plan item.");
  }
  const counterpart =
    delivery.audience === "owner" ? delivery.recipientName : delivery.ownerName;
  const details = [
    `Hoạt động: ${item.activity.label}`,
    `Địa điểm: ${item.place.name}`,
    `Google Maps: ${item.place.mapsUrl}`,
    delivery.confirmation.color
      ? `Màu trang phục: ${delivery.confirmation.color.label}`
      : null,
    delivery.confirmation.transport
      ? `Di chuyển: ${transportLabel(delivery.confirmation.transport, true)}`
      : null,
    `Lời mời: ${invitationUrl}`,
  ].filter((line): line is string => line !== null);
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: `Date with ${counterpart}`,
    dates: `${toGoogleUtcDate(delivery.confirmation.slot.startAt)}/${toGoogleUtcDate(
      delivery.confirmation.slot.endAt,
    )}`,
    ctz: "Asia/Ho_Chi_Minh",
    location: `${item.place.name}, ${item.place.address}`,
    details: details.join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}

function toGoogleUtcDate(value: number): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function transportLabel(value: string, recipient: boolean): string {
  if (!recipient) {
    switch (value) {
      case "pickup":
        return "Pick them up";
      case "meet-there":
        return "Meet there";
      default:
        return "Decide together";
    }
  }
  switch (value) {
    case "pickup":
      return "Đón mình nhé";
    case "meet-there":
      return "Mình tự đến";
    default:
      return "Mình bàn sau nhé";
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}
