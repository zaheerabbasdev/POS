import axios from "axios";

// Backend's standard error shape (SAD Chapter 34 / API Spec Chapter 17).
export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: { field?: string; message: string }[];
}

// The backend's httpOnly auth cookie is scoped to whichever host answers the
// request — so the API must be called on the SAME host the browser loaded
// this app from (localhost, a LAN IP, ...), or the cookie becomes invisible
// to proxy.ts's auth check after login (login "succeeds" but bounces
// straight back to /login). Deriving this from window.location.hostname at
// runtime, rather than baking in one fixed host, makes the app work
// identically whether opened via localhost or a LAN IP. NEXT_PUBLIC_API_URL
// remains available as an explicit override for a genuinely separate API
// host (e.g. a real deployment), but leave it unset for local dev.
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
}

const API_BASE_URL = resolveApiBaseUrl();

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
