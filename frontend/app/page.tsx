import { redirect } from "next/navigation";

// proxy.ts already sends unauthenticated visitors to /login before this
// ever renders; authenticated visitors land here and go straight to the
// dashboard shell.
export default function Home() {
  redirect("/dashboard");
}
