import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      {/* ResetPasswordForm reads useSearchParams() (the reset token), which
          opts the page out of static prerendering unless wrapped in
          Suspense — without this, `next build` fails outright on this page. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
