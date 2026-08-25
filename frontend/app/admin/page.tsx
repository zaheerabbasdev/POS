import { redirect } from "next/navigation";

// The Platform Admin dashboard moved from bare "/admin" to "/admin/dashboard"
// (matching the shop side's "/dashboard" landing page). This keeps a typed
// or bookmarked "/admin" URL working instead of 404ing.
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
