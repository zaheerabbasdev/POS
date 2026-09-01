import { Suspense } from "react";
import { Center } from "@mantine/core";
import { LoginForm } from "@/components/login-form";

// Separate from /login by design — that page is the public entry point for
// real shop owners/staff (and shows the "Register Shop" self-signup link,
// which makes no sense here). This one is only ever meant to be visited by
// platform staff.
export default function AdminLoginPage() {
  return (
    <Center style={{ flex: 1, backgroundColor: "var(--mantine-color-gray-0)", padding: "1.5rem" }}>
      {/* LoginForm reads useSearchParams() (e.g. a `next=` redirect target),
          which opts the page out of static prerendering unless wrapped in
          Suspense — without this, `next build` fails outright on this page. */}
      <Suspense fallback={null}>
        <LoginForm variant="platform" />
      </Suspense>
    </Center>
  );
}
