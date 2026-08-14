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
// identically whether opened via localhost or a LAN IP.
//
// When NEXT_PUBLIC_API_URL is set (a real deployment, frontend and backend
// on separate hosts), calling it directly from the browser would make the
// auth cookie third-party and many browsers now refuse to store those at
// all — see the comment in next.config.ts. So in the browser we instead
// call our own origin at "/api/v1/...", which next.config.ts's rewrite
// quietly forwards to the real backend server-side, keeping the cookie
// first-party. NEXT_PUBLIC_API_URL is still used as-is for any server-side
// (non-browser) call, since those never touch cookies or that rewrite.
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL;
  }
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
