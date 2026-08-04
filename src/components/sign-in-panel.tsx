"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowRight, GoogleLogo, LockKey, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";

export function SignInPanel() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signIn("google", { redirectTo: "/dashboard" });
    } catch {
      setError("Google sign-in could not start. Check the development OAuth configuration.");
      setBusy(false);
    }
  }

  return (
    <main className="entry-page">
      <section className="entry-masthead" aria-labelledby="entry-title">
        <div className="brand-mark"><Sparkle weight="fill" aria-hidden="true" /> Pick-a-Date</div>
        <div className="entry-copy">
          <p className="overline">Private invitation studio</p>
          <h1 id="entry-title">Make the invitation feel like part of the date.</h1>
          <p>
            Curate the time, activity, place and a few playful details. Your guest
            gets one simple link and the final choice is theirs.
          </p>
        </div>
        <div className="entry-photo" aria-hidden="true">
          <Image src="/images/places/ice-cream-pastel.jpg" alt="" fill priority sizes="46vw" />
        </div>
      </section>

      <section className="sign-in-card" aria-labelledby="sign-in-title">
        <div className="sign-in-icon"><LockKey weight="duotone" aria-hidden="true" /></div>
        <p className="overline">Owner access</p>
        <h2 id="sign-in-title">Your planning desk</h2>
        <p>Only the Google account allowlisted for this personal app can enter.</p>
        <button className="button button-primary button-wide" type="button" onClick={handleSignIn} disabled={busy}>
          <GoogleLogo weight="bold" aria-hidden="true" />
          {busy ? "Opening Google…" : "Continue with Google"}
          <ArrowRight weight="bold" aria-hidden="true" />
        </button>
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
        <p className="privacy-note">Identity only. No Calendar permission is requested.</p>
      </section>
    </main>
  );
}
