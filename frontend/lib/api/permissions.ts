import { apiClient } from "../api-client";

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

// GET /api/v1/permissions.
export async function fetchPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<{ data: Permission[] }>("/permissions");
  return data.data;
}
