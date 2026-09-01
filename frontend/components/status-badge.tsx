"use client";

import { Badge } from "@mantine/core";
import {
  SALE_STATUS_COLORS,
  PURCHASE_STATUS_COLORS,
  REPAIR_STATUS_COLORS,
  WARRANTY_STATUS_COLORS,
  SHOP_STATUS_COLORS,
  SUBSCRIPTION_STATUS_COLORS,
  IMEI_STATUS_COLORS,
  EMPLOYEE_STATUS_COLORS,
} from "@/lib/theme";

type StatusType =
  | "sale"
  | "purchase"
  | "repair"
  | "warranty"
  | "shop"
  | "subscription"
  | "imei"
  | "employee"
  | "generic";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  size?: "xs" | "sm" | "md";
}


const GENERIC_STATUS_COLORS: Record<string, string> = {
  active:   "green",
  inactive: "gray",
  ACTIVE:   "green",
  INACTIVE: "gray",
};

const COLOR_MAPS: Record<StatusType, Record<string, string>> = {
  sale:         SALE_STATUS_COLORS,
  purchase:     PURCHASE_STATUS_COLORS,
  repair:       REPAIR_STATUS_COLORS,
  warranty:     WARRANTY_STATUS_COLORS,
  shop:         SHOP_STATUS_COLORS,
  subscription: SUBSCRIPTION_STATUS_COLORS,
  imei:         IMEI_STATUS_COLORS,
  employee:     EMPLOYEE_STATUS_COLORS,
  generic:      GENERIC_STATUS_COLORS,
};

/** Human-readable labels for backend enum values. */
const DISPLAY_LABELS: Partial<Record<string, string>> = {
  PAID:                  "Paid",
  PARTIAL:               "Partial",
  UNPAID:                "Unpaid",
  PENDING:               "Pending",
  RECEIVED:              "Received",
  UNDER_INSPECTION:      "Inspection",
  WAITING_FOR_PARTS:     "Waiting Parts",
  IN_PROGRESS:           "In Progress",
  READY_FOR_DELIVERY:    "Ready",
  DELIVERED:             "Delivered",
  CANCELLED:             "Cancelled",
  ACTIVE:                "Active",
  INACTIVE:              "Inactive",
  EXPIRED:               "Expired",
  CLAIMED:               "Claimed",
  TRIAL:                 "Trial",
  SUSPENDED:             "Suspended",
  PAST_DUE:              "Past Due",
  AVAILABLE:             "Available",
  RESERVED:              "Reserved",
  SOLD:                  "Sold",
  RETURNED:              "Returned",
  UNDER_REPAIR:          "Repair",
  REPLACED:              "Replaced",
};

/**
 * Unified status badge. Maps backend enum values to consistent Mantine Badge
 * colors and human-readable labels. Never color alone — label always present.
 */
export function StatusBadge({ status, type = "generic", size = "sm" }: StatusBadgeProps) {
  const colorMap = COLOR_MAPS[type] ?? GENERIC_STATUS_COLORS;
  const color    = colorMap[status] ?? "gray";
  const label    = DISPLAY_LABELS[status] ?? status;

  return (
    <Badge
      color={color}
      variant="light"
      size={size}
      radius="sm"
      style={{ textTransform: "none", fontWeight: 500 }}
    >
      {label}
    </Badge>
  );
}
