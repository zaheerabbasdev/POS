import { apiClient } from "../api-client";

export type ExportFormat = "csv" | "excel" | "pdf";

// POST /api/v1/export/report (API Spec Chapter 51.1).
export async function exportReport(
  reportType: string,
  format: ExportFormat,
  filters: { startDate?: string; endDate?: string } = {},
): Promise<void> {
  const response = await apiClient.post(
    "/export/report",
    { reportType, format, filters },
    { responseType: "blob" },
  );

  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `${reportType.replace("/", "-")}.${format === "excel" ? "xlsx" : format}`;

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
