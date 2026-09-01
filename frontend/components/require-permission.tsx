"use client";

import { Paper, Group, Text, ThemeIcon, Skeleton } from "@mantine/core";
import { ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface RequirePermissionProps {
  /** Any one of these grants access — mirrors the backend's requirePermission(...) for the same route. */
  permissions: string[];
  children: React.ReactNode;
}

/**
 * Client-side mirror of the backend's requirePermission middleware.
 * The server is the real enforcement boundary — this only prevents a broken
 * UX (stuck spinner / raw 403) when a user navigates to a restricted URL directly.
 */
export function RequirePermission({ permissions, children }: RequirePermissionProps) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Skeleton height={20} width="50%" mb="sm" />
        <Skeleton height={14} width="80%" />
      </Paper>
    );
  }

  const hasAccess = user ? permissions.some((p) => user.permissions.includes(p)) : false;

  if (!hasAccess) {
    return (
      <Paper withBorder p="xl" radius="md" style={{ maxWidth: 480 }}>
        <Group gap="md" align="flex-start" wrap="nowrap">
          <ThemeIcon
            size={44}
            radius="md"
            style={{
              backgroundColor: "var(--mantine-color-red-0)",
              color: "var(--mantine-color-red-6)",
              border: "none",
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={22} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="sm" mb={4}>
              Access denied
            </Text>
            <Text size="sm" c="dimmed" lh={1.5}>
              You don&apos;t have permission to view this page. If you think this is a mistake, ask
              an administrator to grant your role the required permission.
            </Text>
          </div>
        </Group>
      </Paper>
    );
  }

  return <>{children}</>;
}
