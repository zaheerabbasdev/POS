import axios from "axios";

// Backend's standard error shape (SAD Chapter 34 / API Spec Chapter 17).
export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: { field?: string; message: string }[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// `withCredentials` sends/receives the httpOnly `pos_token` cookie the
// backend sets on login — that's what actually authenticates requests.
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Pulls the backend's { message, code } out of an axios error, with a fallback for network failures. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
