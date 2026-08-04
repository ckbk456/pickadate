import type { Metadata } from "next";
import { SignInPanel } from "@/components/sign-in-panel";

export const metadata: Metadata = { title: "Owner sign in" };

export default function SignInPage() {
  return <SignInPanel />;
}
