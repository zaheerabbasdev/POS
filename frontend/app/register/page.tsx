import { Center } from "@mantine/core";
import { RegisterShopForm } from "@/components/register-shop-form";

export default function RegisterPage() {
  return (
    <Center style={{ flex: 1, backgroundColor: "var(--mantine-color-gray-0)", padding: "1.5rem" }}>
      <RegisterShopForm />
    </Center>
  );
}
