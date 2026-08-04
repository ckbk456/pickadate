import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pick-a-Date",
    template: "%s · Pick-a-Date",
  },
  description: "A private, personal invitation planner.",
  applicationName: "Pick-a-Date",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4ede3",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexAuthNextjsServerProvider>
          <AppProviders>{children}</AppProviders>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
