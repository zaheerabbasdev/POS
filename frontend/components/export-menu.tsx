"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportReport, type ExportFormat } from "@/lib/api/export";

interface ExportMenuProps {
  reportType: string;
  filters?: { startDate?: string; endDate?: string };
}

const FORMAT_LABELS: Record<ExportFormat, string> = { pdf: "PDF", excel: "Excel", csv: "CSV" };

/** Export (API Spec Chapter 51) — a small per-report dropdown for downloading it as PDF/Excel/CSV. */
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
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        disabled={pending !== null}
      >
        <Download />
        {pending ? "Exporting..." : "Export"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((format) => (
            <DropdownMenuItem key={format} onClick={() => handleExport(format)}>
              {FORMAT_LABELS[format]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
