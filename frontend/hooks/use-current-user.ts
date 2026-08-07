import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/api/auth";

export const currentUserQueryKey = ["auth", "me"] as const;

/**
 * Single source of truth for "who is logged in" on the client. proxy.ts only
 * checks whether the auth cookie exists (fast, no DB hit) to gate routes;
 * this hook does the real authenticated fetch and is what components read
 * for the user's name/role/permissions.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });
}
