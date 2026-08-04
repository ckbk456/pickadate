"use client";

import { WarningCircle } from "@phosphor-icons/react";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="centered-state"><WarningCircle size={32} weight="duotone" /><h1>The dashboard could not finish loading.</h1><p>Your data was not changed. Check the development connection and try again.</p><button className="button button-primary" type="button" onClick={reset}>Try again</button></main>;
}
