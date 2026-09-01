"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  Button,
  Textarea,
  Text,
} from "@mantine/core";
import { createWarrantyClaim, type Warranty } from "@/lib/api/warranties";
import { getApiErrorMessage } from "@/lib/api-client";

interface ClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty?: Warranty;
}

export function ClaimDialog({ open, onOpenChange, warranty }: ClaimDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={`Claim Warranty — ${warranty?.product ?? ""}`}
      size="md"
    >
      {warranty && <ClaimDialogBody key={warranty.id} warranty={warranty} onOpenChange={onOpenChange} />}
    </Modal>
  );
}

function ClaimDialogBody({ warranty, onOpenChange }: { warranty: Warranty; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [issue, setIssue] = useState("");

  const mutation = useMutation({
    mutationFn: () => createWarrantyClaim({ warrantyId: warranty.id, issue }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast.success("Claim registered — a repair ticket was opened.");
      router.push(`/dashboard/repairs/${result.repairId}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {warranty.customer} · Invoice {warranty.invoiceNumber} · Expires{" "}
        {new Date(warranty.expiryDate).toLocaleDateString()}. Filing a claim opens a repair ticket at no charge.
      </Text>

      <Textarea
        label="Issue"
        minRows={3}
        value={issue}
        onChange={(e) => setIssue(e.currentTarget.value)}
        data-autofocus
        withAsterisk
      />

      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={!issue.trim() || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()} color="indigo">
          Submit Claim
        </Button>
      </Group>
    </Stack>
  );
}
