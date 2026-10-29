import type { AuthConfig } from "convex/server";

const siteUrl = process.env.CONVEX_SITE_URL;
if (!siteUrl) {
  throw new Error("CONVEX_SITE_URL is not configured.");
}

export default {
  providers: [
    {
      domain: siteUrl,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
