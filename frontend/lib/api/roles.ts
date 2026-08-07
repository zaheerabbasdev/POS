import { apiClient } from "../api-client";

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: string[];
}

export interface CreateRoleInput {
  name: string;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// GET /api/v1/roles (API Spec Chapter 22.1).
export async function fetchRoles(): Promise<Role[]> {
  const { data } = await apiClient.get<{ data: Role[] }>("/roles");
  return data.data;
}

// POST /api/v1/roles (API Spec Chapter 22.2).
export async function createRole(input: CreateRoleInput): Promise<Role> {
  const { data } = await apiClient.post<{ data: Role }>("/roles", input);
  return data.data;
}

// PATCH /api/v1/roles/{id} (API Spec Chapter 22.4).
export async function updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
  const { data } = await apiClient.patch<{ data: Role }>(`/roles/${id}`, input);
  return data.data;
}

// POST /api/v1/roles/{id}/permissions (API Spec Chapter 22.3) — replaces
// the role's full permission set with the given list.
export async function assignPermissions(id: string, permissions: string[]): Promise<Role> {
  const { data } = await apiClient.post<{ data: Role }>(`/roles/${id}/permissions`, { permissions });
  return data.data;
}

// DELETE /api/v1/roles/{id} (API Spec Chapter 22.5).
export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}
