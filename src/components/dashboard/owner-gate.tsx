"use client";

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { WarningCircle } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@convex/_generated/api";

export function OwnerGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const access = useQuery(api.owner.getAccessState, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && access === undefined)) {
    return (
      <main className="centered-state" aria-busy="true">
        <span className="loading-orbit" aria-hidden="true" />
        <p>Opening your planning desk…</p>
      </main>
    );
  }

  if (!isAuthenticated || access?.state === "signed-out") {
    return (
      <main className="centered-state">
        <WarningCircle size={32} weight="duotone" aria-hidden="true" />
        <h1>Sign-in required</h1>
        <p>Your session ended before the dashboard opened.</p>
        <a className="button button-primary" href="/sign-in">Return to sign in</a>
      </main>
    );
  }

  if (access?.state !== "owner") {
    const message =
      access?.state === "misconfigured"
        ? "OWNER_EMAIL is not configured in this Convex environment."
        : access?.state === "unverified"
          ? "Google did not provide a verified email for this account."
          : "This Google account is signed in, but it is not the allowlisted owner.";
    return (
      <main className="centered-state">
        <WarningCircle size={32} weight="duotone" aria-hidden="true" />
        <h1>Owner access unavailable</h1>
        <p>{message}</p>
        <button className="button button-secondary" type="button" onClick={() => void signOut()}>
          Sign out and try another account
        </button>
      </main>
    );
  }

  return children;
}
