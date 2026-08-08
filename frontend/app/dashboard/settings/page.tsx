"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    return <Skeleton className="h-64 w-full" />;
  }

  const values: ShopSettings = { ...settings, ...form };
  const setField = (key: keyof ShopSettings, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Shop information shown across invoices, receipts, and the sidebar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shop Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploadField
              type="logo"
              imageUrl={settings.shop_logo || null}
              label="Logo"
              invalidateQueryKeys={[["settings"]]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-shop-name" className="text-sm font-medium">
                Shop name
              </label>
              <Input id="settings-shop-name" value={values.shop_name} onChange={(e) => setField("shop_name", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-shop-address" className="text-sm font-medium">
                Address
              </label>
              <Input
                id="settings-shop-address"
                value={values.shop_address}
                onChange={(e) => setField("shop_address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-shop-phone" className="text-sm font-medium">
                  Contact number
                </label>
                <Input
                  id="settings-shop-phone"
                  value={values.shop_phone}
                  onChange={(e) => setField("shop_phone", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-shop-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="settings-shop-email"
                  type="email"
                  value={values.shop_email}
                  onChange={(e) => setField("shop_email", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-currency" className="text-sm font-medium">
                  Currency
                </label>
                <Input id="settings-currency" value={values.currency} onChange={(e) => setField("currency", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-timezone" className="text-sm font-medium">
                  Time zone
                </label>
                <Input
                  id="settings-timezone"
                  value={values.timezone}
                  onChange={(e) => setField("timezone", e.target.value)}
                />
              </div>
            </div>

            <Button
              className="self-start"
              disabled={!form || mutation.isPending}
              onClick={() => form && mutation.mutate(form)}
            >
              {mutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
