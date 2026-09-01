import { Center } from "@mantine/core";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Center style={{ flex: 1, backgroundColor: "var(--mantine-color-gray-0)", padding: "1.5rem" }}>
      <ForgotPasswordForm />
    </Center>
  );
}
