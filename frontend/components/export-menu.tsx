"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button, Menu } from "@mantine/core";
import { exportReport, type ExportFormat } from "@/lib/api/export";

interface ExportMenuProps {
  reportType: string;
  filters?: { startDate?: string; endDate?: string };
}

const FORMAT_LABELS: Record<ExportFormat, string> = { pdf: "PDF", excel: "Excel", csv: "CSV" };

export function ExportMenu({ reportType, filters }: ExportMenuProps) {
  const [pending, setPending] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setPending(format);
    try {
      await exportReport(reportType, format, filters);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Menu position="bottom-end" shadow="md">
      <Menu.Target>
        <Button variant="subtle" size="sm" color="gray" leftSection={<Download size={16} />} loading={pending !== null}>
          {pending ? "Exporting..." : "Export"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((format) => (
          <Menu.Item key={format} onClick={() => handleExport(format)}>
            {FORMAT_LABELS[format]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
