"use client";

import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

interface RequirePermissionProps {
  /** Any one of these grants access — mirrors the backend's requirePermission(...) for the same route. */
  permissions: string[];
  children: React.ReactNode;
}

/**
 * Client-side mirror of the backend's requirePermission middleware. The
 * server is the real enforcement (this never grants access the API
 * wouldn't) — this exists purely so a role without a permission sees a
 * clear "you don't have access" card instead of a stuck loading spinner or
 * a raw 403 toast the first time they land on a restricted page directly
 * (typed URL, bookmark, browser back) rather than via the sidebar, which
 * already hides links they can't use.
 */
export function RequirePermission({ permissions, children }: RequirePermissionProps) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const hasAccess = user ? permissions.some((p) => user.permissions.includes(p)) : false;

  if (!hasAccess) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Access denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view this page. If you think this is a mistake, ask an administrator to
            grant your role the right permission.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
