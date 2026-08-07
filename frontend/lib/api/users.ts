import { apiClient } from "../api-client";

export interface UserListItem {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string | null;
  roleId: string | null;
  status: "active" | "inactive";
}

export interface UserDetail extends UserListItem {
  phone: string | null;
  profileImage: string | null;
  lastLogin: string | null;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: "active" | "inactive";
}

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  roleId?: string;
  status?: "active" | "inactive";
  profileImage?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/users (API Spec Chapter 21.1).
export async function fetchUsers(params: UserListParams = {}): Promise<Paginated<UserListItem>> {
  const { data } = await apiClient.get<Paginated<UserListItem>>("/users", { params });
  return data;
}

// POST /api/v1/users (API Spec Chapter 21.3).
export async function createUser(input: CreateUserInput): Promise<UserDetail> {
  const { data } = await apiClient.post<{ data: UserDetail }>("/users", input);
  return data.data;
}

// PATCH /api/v1/users/{id} (API Spec Chapter 21.4).
export async function updateUser(id: string, input: UpdateUserInput): Promise<UserDetail> {
  const { data } = await apiClient.patch<{ data: UserDetail }>(`/users/${id}`, input);
  return data.data;
}

// DELETE /api/v1/users/{id} (API Spec Chapter 21.5) — soft delete (deactivate).
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
