"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Stack,
  Group,
  TextInput,
  Button,
  Card,
  Text,
  SimpleGrid,
  Skeleton,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { ImageUploadField } from "@/components/image-upload-field";
import { fetchSettings, updateSettings, type ShopSettings } from "@/lib/api/settings";
import { getApiErrorMessage } from "@/lib/api-client";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<ShopSettings> | null>(null);

  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const mutation = useMutation({
    mutationFn: (values: Partial<ShopSettings>) => updateSettings(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved.");
      setForm(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !settings) {
    return <Skeleton height={256} width="100%" radius="md" />;
  }

  const values: ShopSettings = { ...settings, ...form };
  const setField = (key: keyof ShopSettings, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Stack gap="lg">
      <PageHeader
        title="Settings"
        description="Shop information shown across invoices, receipts, and the sidebar."
      />

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card shadow="sm" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Shop Logo</Text>
          <ImageUploadField
            type="logo"
            imageUrl={settings.shop_logo || null}
            label="Logo"
            invalidateQueryKeys={[["settings"]]}
          />
        </Card>

        <Card shadow="sm" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Business Information</Text>
          
          <Stack gap="md">
            <TextInput
              label="Shop name"
              value={values.shop_name}
              onChange={(e) => setField("shop_name", e.currentTarget.value)}
            />
            
            <TextInput
              label="Address"
              value={values.shop_address}
              onChange={(e) => setField("shop_address", e.currentTarget.value)}
            />
            
            <SimpleGrid cols={2} spacing="md">
              <TextInput
                label="Contact number"
                value={values.shop_phone}
                onChange={(e) => setField("shop_phone", e.currentTarget.value)}
              />
              <TextInput
                label="Email"
                type="email"
                value={values.shop_email}
                onChange={(e) => setField("shop_email", e.currentTarget.value)}
              />
            </SimpleGrid>
            
            <SimpleGrid cols={2} spacing="md">
              <TextInput
                label="Currency"
                value={values.currency}
                onChange={(e) => setField("currency", e.currentTarget.value)}
              />
              <TextInput
                label="Time zone"
                value={values.timezone}
                onChange={(e) => setField("timezone", e.currentTarget.value)}
              />
            </SimpleGrid>

            <Group mt="md">
              <Button
                color="indigo"
                disabled={!form || mutation.isPending}
                loading={mutation.isPending}
                onClick={() => form && mutation.mutate(form)}
              >
                Save Settings
              </Button>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
