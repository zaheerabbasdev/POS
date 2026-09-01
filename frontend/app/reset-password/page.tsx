import { Suspense } from "react";
import { Center } from "@mantine/core";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Center style={{ flex: 1, backgroundColor: "var(--mantine-color-gray-0)", padding: "1.5rem" }}>
      {/* ResetPasswordForm reads useSearchParams() (the reset token), which
          opts the page out of static prerendering unless wrapped in
          Suspense — without this, `next build` fails outright on this page. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </Center>
  );
}
