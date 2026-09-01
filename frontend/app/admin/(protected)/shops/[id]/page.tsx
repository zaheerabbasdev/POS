"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Stack,
  Group,
  Button,
  Card,
  Text,
  Modal,
  Textarea,
  NumberInput,
  SimpleGrid,
  Skeleton,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RequirePermission } from "@/components/require-permission";
import { fetchShop, suspendShop, activateShop, archiveShop, extendTrial } from "@/lib/api/shops";
import { getApiErrorMessage } from "@/lib/api-client";

const DAY_PRESETS = [7, 15, 30];

function ExtendTrialDialog({
  shopId,
  open,
  onOpenChange,
}: {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number | string>(30);
  const [reason, setReason] = useState("");

  const effectiveDays = Number(days) || 0;

  const mutation = useMutation({
    mutationFn: () => extendTrial(shopId, { days: effectiveDays, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops", shopId] });
      toast.success(`Trial extended by ${effectiveDays} day(s).`);
      onOpenChange(false);
      setReason("");
      setDays(30);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Modal opened={open} onClose={() => onOpenChange(false)} title="Extend free trial">
      <Stack gap="md">
        <Text size="sm" c="dimmed">Adds days to the current trial (or starts fresh from today if it already expired).</Text>
        
        <Group gap="xs">
          {DAY_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={days === preset ? "filled" : "outline"}
              color="indigo"
              size="sm"
              onClick={() => setDays(preset)}
            >
              {preset} Days
            </Button>
          ))}
          <NumberInput
            min={1}
            placeholder="Custom"
            value={days}
            onChange={setDays}
            w={100}
          />
        </Group>

        <Textarea
          label="Reason"
          placeholder="Why is this trial being extended?"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            color="indigo"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim() || effectiveDays <= 0}
            loading={mutation.isPending}
          >
            Extend Trial
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ShopDetailPageContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [extendOpen, setExtendOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["admin", "shops", id],
    queryFn: () => fetchShop(id),
  });

  const statusMutation = useMutation({
    mutationFn: () => (shop?.status === "SUSPENDED" ? activateShop(id) : suspendShop(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops"] });
      toast.success(shop?.status === "SUSPENDED" ? "Shop activated." : "Shop suspended.");
      setStatusConfirmOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveShop(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops"] });
      toast.success("Shop archived.");
      setArchiveConfirmOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !shop) {
    return (
      <Stack gap="lg">
        <Skeleton height={32} width={300} />
        <Skeleton height={300} width="100%" radius="md" />
      </Stack>
    );
  }

  const isSuspended = shop.status === "SUSPENDED";
  const isArchived = shop.status === "CANCELLED";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title={
            <Group gap="sm">
              {shop.name}
              <ShopStatusBadge status={shop.status} />
            </Group>
          }
          description={`Created ${new Date(shop.createdAt).toLocaleDateString()}`}
        />
        {!isArchived ? (
          <Group gap="sm">
            <Button variant="default" onClick={() => setExtendOpen(true)} disabled={!shop.subscription}>
              Extend Trial
            </Button>
            <Button color={isSuspended ? "green" : "red"} onClick={() => setStatusConfirmOpen(true)}>
              {isSuspended ? "Activate" : "Suspend"}
            </Button>
            <Button color="red" variant="outline" onClick={() => setArchiveConfirmOpen(true)}>
              Archive Shop
            </Button>
          </Group>
        ) : null}
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card shadow="sm" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Shop information</Text>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Owner</dt>
            <dd>{shop.owner?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Owner username</dt>
            <dd>{shop.owner?.username ?? "—"}</dd>
            <dt className="text-muted-foreground">Owner email</dt>
            <dd>{shop.owner?.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{shop.phone ?? "—"}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{shop.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd>{[shop.address, shop.city, shop.country].filter(Boolean).join(", ") || "—"}</dd>
          </dl>
        </Card>

        <Card shadow="sm" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Subscription</Text>
          {shop.subscription ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Plan</dt>
              <dd>{shop.subscription.plan.name}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{shop.subscription.status}</dd>
              <dt className="text-muted-foreground">Started</dt>
              <dd>{new Date(shop.subscription.startDate).toLocaleDateString()}</dd>
              <dt className="text-muted-foreground">Ends</dt>
              <dd>{shop.subscription.endDate ? new Date(shop.subscription.endDate).toLocaleDateString() : "No end date"}</dd>
              <dt className="text-muted-foreground">Payment</dt>
              <dd>{shop.subscription.paymentStatus}</dd>
            </dl>
          ) : (
            <Text size="sm" c="dimmed">No subscription on record.</Text>
          )}
        </Card>
      </SimpleGrid>

      <ExtendTrialDialog shopId={id} open={extendOpen} onOpenChange={setExtendOpen} />
      <ConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={isSuspended ? "Activate shop" : "Suspend shop"}
        description={
          isSuspended
            ? `${shop.name} will regain access to the POS.`
            : `${shop.name} will lose access to operational POS actions (sales, purchases, inventory, etc.) until reactivated. They'll still be able to log in and view their data.`
        }
        confirmLabel={isSuspended ? "Activate" : "Suspend"}
        isPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate()}
      />
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Archive shop"
        description={`This permanently closes "${shop.name}" — it cannot be undone or reactivated. The owner will lose operational access; their data is kept, not deleted.`}
        confirmLabel="Archive Shop"
        isPending={archiveMutation.isPending}
        onConfirm={() => archiveMutation.mutate()}
      />
    </Stack>
  );
}

export default function AdminShopDetailPage(props: PageProps<"/admin/shops/[id]">) {
  const { id } = use(props.params);
  return (
    <RequirePermission permissions={["PLATFORM_SHOP_VIEW"]}>
      <ShopDetailPageContent id={id} />
    </RequirePermission>
  );
}
