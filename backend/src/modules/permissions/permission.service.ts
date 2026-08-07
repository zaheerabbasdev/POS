import { prisma } from "../../config/prisma.js";

/**
 * GET /api/v1/permissions — the full permission catalog, for the Roles
 * admin screen's "assign permissions" UI. Referenced in the API Spec's
 * Part 2 summary ("Permission APIs ✅") but never given its own numbered
 * chapter with a literal request/response — this is the minimal read-only
 * endpoint that shape implies.
 */
export async function listPermissions() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { permissionName: "asc" }],
    select: { id: true, permissionName: true, module: true, description: true },
  });

  return permissions.map((p) => ({
    id: p.id,
    code: p.permissionName,
    module: p.module,
    description: p.description,
  }));
}
