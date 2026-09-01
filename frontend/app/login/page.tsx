import { Suspense } from "react";
import { Center } from "@mantine/core";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Center style={{ flex: 1, backgroundColor: "var(--mantine-color-gray-0)", padding: "1.5rem" }}>
      {/* LoginForm reads useSearchParams() (e.g. a `next=` redirect target),
          which opts the page out of static prerendering unless wrapped in
          Suspense — without this, `next build` fails outright on this page. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </Center>
  );
}
