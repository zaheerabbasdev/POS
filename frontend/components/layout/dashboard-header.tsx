"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Group,
  Avatar,
  Menu,
  Text,
  Box,
  Divider,
  ActionIcon,
  Burger,
  Skeleton,
  rem,
  UnstyledButton,
} from "@mantine/core";
import { KeyRound, LogOut, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { useCurrentUser, currentUserQueryKey } from "@/hooks/use-current-user";
import { logout } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";

function getInitials(name: string): string {
  const parts   = name.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
    : parts[0]!.slice(0, 2);
  return initials.toUpperCase();
}

interface DashboardHeaderProps {
  label?: string;
  /** Called when the mobile burger is clicked */
  onToggleMobile?: () => void;
  mobileOpen?: boolean;
  /** Called when the desktop collapse toggle is clicked */
  onToggleCollapse?: () => void;
  collapsed?: boolean;
}

export function DashboardHeader({
  label = "Dashboard",
  onToggleMobile,
  mobileOpen = false,
  onToggleCollapse,
  collapsed = false,
}: DashboardHeaderProps) {
  const router        = useRouter();
  const queryClient   = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      router.push("/login");
      router.refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Box
      component="header"
      style={{
        height: 64,
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        backgroundColor: "var(--mantine-color-body)",
        display: "flex",
        alignItems: "center",
        padding: "0 1.25rem",
        position: "sticky",
        top: 0,
        zIndex: 99,
        flexShrink: 0,
      }}
    >
      <Group justify="space-between" style={{ width: "100%" }}>
        {/* Left: toggle + page label */}
        <Group gap="sm">
          {/* Desktop collapse toggle */}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            onClick={onToggleCollapse}
            visibleFrom="sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ display: "flex" }}
          >
            <Burger
              opened={!collapsed}
              size="xs"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            />
          </ActionIcon>

          {/* Mobile drawer toggle */}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            onClick={onToggleMobile}
            hiddenFrom="sm"
            aria-label="Toggle navigation"
          >
            <Burger opened={mobileOpen} size="xs" aria-label="Toggle navigation" />
          </ActionIcon>

          <Text fw={500} size="sm" c="dimmed">
            {label}
          </Text>
        </Group>

        {/* Right: user menu */}
        {isLoading || !user ? (
          <Group gap="xs">
            <Skeleton circle height={36} width={36} />
            <Skeleton height={14} width={80} visibleFrom="sm" />
          </Group>
        ) : (
          <Menu shadow="sm" width={220} position="bottom-end">
            <Menu.Target>
              <UnstyledButton
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "4px 8px",
                  borderRadius: 8,
                  transition: "background-color 120ms ease",
                }}
              >
                <Avatar
                  color="indigo"
                  radius="xl"
                  size={34}
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  {getInitials(user.name)}
                </Avatar>
                <Box visibleFrom="sm" style={{ textAlign: "left" }}>
                  <Text size="sm" fw={500} lh={1.2}>
                    {user.name}
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.2}>
                    {user.role ?? "No role"}
                  </Text>
                </Box>
                <ChevronDown size={14} style={{ color: "var(--mantine-color-gray-5)" }} />
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              {/* User info header */}
              <Box px="sm" py="xs">
                <Text size="sm" fw={600}>
                  {user.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {user.role ?? "No role assigned"}
                </Text>
              </Box>
              <Divider />

              <Menu.Item
                leftSection={<KeyRound size={14} />}
                onClick={() => setChangePasswordOpen(true)}
              >
                Change password
              </Menu.Item>

              <Divider />

              <Menu.Item
                leftSection={<LogOut size={14} />}
                color="red"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Signing out…" : "Log out"}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </Box>
  );
}
