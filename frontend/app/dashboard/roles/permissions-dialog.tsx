"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  Button,
  Checkbox,
  Text,
  SimpleGrid,
  ScrollArea,
} from "@mantine/core";
import { fetchPermissions, type Permission } from "@/lib/api/permissions";
import { assignPermissions, type Role } from "@/lib/api/roles";
import { getApiErrorMessage } from "@/lib/api-client";

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function PermissionsDialog({ open, onOpenChange, role }: PermissionsDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={`Permissions — ${role?.name ?? ""}`}
      size="lg"
    >
      {role && <PermissionsDialogBody key={role.id} role={role} onOpenChange={onOpenChange} />}
    </Modal>
  );
}

function PermissionsDialogBody({ role, onOpenChange }: { role: Role; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role.permissions));

  const { data: permissions } = useQuery({ queryKey: ["permissions"], queryFn: fetchPermissions });

  const grouped = useMemo(() => {
    const byModule = new Map<string, Permission[]>();
    for (const permission of permissions ?? []) {
      const list = byModule.get(permission.module) ?? [];
      list.push(permission);
      byModule.set(permission.module, list);
    }
    return Array.from(byModule.entries());
  }, [permissions]);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () => assignPermissions(role.id, Array.from(selected)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Permissions updated.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Choose exactly what this role can do. Replaces the full permission set for this role.
      </Text>

      <ScrollArea h={400} offsetScrollbars type="auto">
        <Stack gap="lg">
          {grouped.map(([module, modulePermissions]) => (
            <Stack key={module} gap="xs">
              <Text size="sm" fw={600} c="dimmed">{module}</Text>
              <SimpleGrid cols={2} spacing="sm">
                {modulePermissions.map((permission) => (
                  <Checkbox
                    key={permission.code}
                    label={permission.code}
                    checked={selected.has(permission.code)}
                    onChange={() => toggle(permission.code)}
                    size="sm"
                  />
                ))}
              </SimpleGrid>
            </Stack>
          ))}
        </Stack>
      </ScrollArea>

      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()} color="indigo">
          Save permissions
        </Button>
      </Group>
    </Stack>
  );
}
