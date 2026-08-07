import { apiClient } from "../api-client";

export interface AuthUser {
  id: string;
  name: string;
  role: string | null;
}

export interface CurrentUser extends AuthUser {
  permissions: string[];
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// POST /api/v1/auth/login (API Spec Chapter 11).
export async function login(username: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<ApiSuccess<{ user: AuthUser; token: string }>>("/auth/login", {
    username,
    password,
  });
  return data.data.user;
}

// POST /api/v1/auth/logout (API Spec Chapter 12).
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

// GET /api/v1/auth/me (API Spec Chapter 13).
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<ApiSuccess<CurrentUser>>("/auth/me");
  return data.data;
}

// PATCH /api/v1/auth/change-password (API Spec Chapter 14).
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.patch("/auth/change-password", { currentPassword, newPassword });
}

// POST /api/v1/auth/forgot-password (API Spec Chapter 15).
export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

// POST /api/v1/auth/reset-password (API Spec Chapter 10 overview).
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, newPassword });
}
