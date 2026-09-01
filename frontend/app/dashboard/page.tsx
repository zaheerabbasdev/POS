"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  SimpleGrid,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Skeleton,
  Anchor,
  Table,
  Box,
  Divider,
  ThemeIcon,
  Tabs,
} from "@mantine/core";
import {
  Wallet,
  Truck,
  TrendingUp,
  BadgeDollarSign,
  Users,
  Building2,
  Package,
  AlertTriangle,
  PackageX,
  Clock,
  Wrench,
  CheckCircle2,
  BadgeCheck,
  AlarmClockCheck,
  Banknote,
  CreditCard,
  type LucideIcon,
  ArrowRight,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchDashboardSummary, type DashboardSummary } from "@/lib/api/dashboard";

// ─── Tile definitions ─────────────────────────────────────────────────────────

type Tone = "default" | "warning" | "critical" | "success" | "info";

interface TileDef {
  label: string;
  icon: LucideIcon;
  value: (s: DashboardSummary) => string | number;
  tone?: (s: DashboardSummary) => Tone;
  permissions: string[];
  supporting?: (s: DashboardSummary) => string | undefined;
}

const TILES: TileDef[] = [
  {
    label: "Today's Sales",
    icon: Wallet,
    value: (s) => s.todaySales,
    permissions: ["SALE_VIEW", "SALE_CREATE"],
  },
  {
    label: "Monthly Sales",
    icon: TrendingUp,
    value: (s) => s.monthlySales,
    permissions: ["SALE_VIEW", "SALE_CREATE"],
  },
  {
    label: "Today's Purchases",
    icon: Truck,
    value: (s) => s.todayPurchases,
    permissions: ["PURCHASE_VIEW", "PURCHASE_CREATE"],
  },
  {
    label: "Total Revenue",
    icon: BadgeDollarSign,
    value: (s) => s.totalRevenue,
    permissions: ["SALE_VIEW", "SALE_CREATE", "REPORT_VIEW"],
  },
  {
    label: "Total Products",
    icon: Package,
    value: (s) => s.totalProducts,
    permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE", "INVENTORY_VIEW", "INVENTORY_MANAGE"],
  },
  {
    label: "Total Customers",
    icon: Users,
    value: (s) => s.totalCustomers,
    permissions: ["CUSTOMER_VIEW", "CUSTOMER_MANAGE"],
  },
  {
    label: "Total Suppliers",
    icon: Building2,
    value: (s) => s.totalSuppliers,
    permissions: ["SUPPLIER_VIEW", "SUPPLIER_MANAGE"],
  },
  {
    label: "Low Stock",
    icon: AlertTriangle,
    value: (s) => s.lowStockProducts,
    tone: (s) => (s.lowStockProducts > 0 ? "warning" : "default"),
    supporting: (s) => (s.lowStockProducts > 0 ? "Needs restocking" : undefined),
    permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE", "PRODUCT_VIEW", "PRODUCT_MANAGE"],
  },
  {
    label: "Out of Stock",
    icon: PackageX,
    value: (s) => s.outOfStockProducts,
    tone: (s) => (s.outOfStockProducts > 0 ? "critical" : "default"),
    supporting: (s) => (s.outOfStockProducts > 0 ? "Urgent attention needed" : undefined),
    permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE", "PRODUCT_VIEW", "PRODUCT_MANAGE"],
  },
  {
    label: "Pending Payments",
    icon: Clock,
    value: (s) => s.pendingPayments,
    tone: (s) => (s.pendingPayments > 0 ? "warning" : "default"),
    permissions: ["PAYMENT_VIEW", "PAYMENT_MANAGE", "SALE_VIEW", "SALE_CREATE"],
  },
  {
    label: "Payments This Month",
    icon: CreditCard,
    value: (s) => s.monthlyPayments,
    permissions: ["PAYMENT_VIEW", "PAYMENT_MANAGE"],
  },
  {
    label: "Open Cash Drawers",
    icon: Wallet,
    value: (s) => s.openCashDrawers,
    permissions: ["CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"],
  },
  {
    label: "Pending Repairs",
    icon: Wrench,
    value: (s) => s.pendingRepairs,
    tone: (s) => (s.pendingRepairs > 0 ? "warning" : "default"),
    permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"],
  },
  {
    label: "Completed Repairs",
    icon: CheckCircle2,
    value: (s) => s.completedRepairs,
    tone: (s) => (s.completedRepairs > 0 ? "success" : "default"),
    permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"],
  },
  {
    label: "Active Warranties",
    icon: BadgeCheck,
    value: (s) => s.activeWarranties,
    permissions: ["WARRANTY_VIEW", "WARRANTY_MANAGE"],
  },
  {
    label: "Expiring (30d)",
    icon: AlarmClockCheck,
    value: (s) => s.expiringWarranties,
    tone: (s) => (s.expiringWarranties > 0 ? "warning" : "default"),
    permissions: ["WARRANTY_VIEW", "WARRANTY_MANAGE"],
  },
  {
    label: "Monthly Expenses",
    icon: Banknote,
    value: (s) => s.monthlyExpenses,
    permissions: ["EXPENSE_VIEW", "EXPENSE_MANAGE"],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: user }         = useCurrentUser();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  const permissions     = user?.permissions ?? [];
  const has             = (perms: string[]) => perms.some((p) => permissions.includes(p));
  const visibleTiles    = TILES.filter((tile) => has(tile.permissions));

  const showSales    = has(["SALE_VIEW", "SALE_CREATE"]);
  const showPurchases = has(["PURCHASE_VIEW", "PURCHASE_CREATE"]);
  const showRepairs  = has(["REPAIR_VIEW", "REPAIR_MANAGE"]);

  return (
    <Stack gap="xl">
      {/* Welcome */}
      <Box>
        {user ? (
          <>
            <Text size="xl" fw={700} lh={1.2}>
              Welcome back, {user.name}
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Your business overview for today.
            </Text>
          </>
        ) : (
          <>
            <Skeleton height={28} width={280} mb={6} />
            <Skeleton height={16} width={200} />
          </>
        )}
      </Box>

      {/* KPI Grid */}
      {isLoading ? (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="sm">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} height={90} radius="md" />
          ))}
        </SimpleGrid>
      ) : summary ? (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="sm">
          {visibleTiles.map((tile) => (
            <StatCard
              key={tile.label}
              label={tile.label}
              value={tile.value(summary)}
              icon={tile.icon}
              tone={tile.tone?.(summary) ?? "default"}
              supporting={tile.supporting?.(summary)}
            />
          ))}
        </SimpleGrid>
      ) : null}

      {/* Activity tables */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {showSales && (
          <ActivityCard
            title="Recent Sales"
            icon={<Receipt size={16} />}
            viewAllHref="/dashboard/sales"
            isLoading={isLoading}
          >
            {summary?.recentSales && summary.recentSales.length > 0 ? (
              <Table highlightOnHover withRowBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice</Table.Th>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Total</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary.recentSales.map((sale) => (
                    <Table.Tr key={sale.id}>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          href={`/dashboard/sales/${sale.id}`}
                          size="xs"
                          style={{ fontFamily: "var(--mantine-font-family-monospace)" }}
                        >
                          {sale.invoiceNumber}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" truncate style={{ maxWidth: 120 }}>
                          {sale.customer || "Walk-in"}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {sale.totalAmount}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={sale.status} type="sale" size="xs" />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No sales recorded yet.
              </Text>
            )}
          </ActivityCard>
        )}

        {showPurchases && (
          <ActivityCard
            title="Recent Purchases"
            icon={<ShoppingCart size={16} />}
            viewAllHref="/dashboard/purchases"
            isLoading={isLoading}
          >
            {summary?.recentPurchases && summary.recentPurchases.length > 0 ? (
              <Table highlightOnHover withRowBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice</Table.Th>
                    <Table.Th>Supplier</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Total</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary.recentPurchases.map((purchase) => (
                    <Table.Tr key={purchase.id}>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          href={`/dashboard/purchases/${purchase.id}`}
                          size="xs"
                          style={{ fontFamily: "var(--mantine-font-family-monospace)" }}
                        >
                          {purchase.purchaseNumber}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" truncate style={{ maxWidth: 120 }}>
                          {purchase.supplier}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {purchase.totalAmount}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={purchase.status} type="purchase" size="xs" />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No purchases recorded yet.
              </Text>
            )}
          </ActivityCard>
        )}

        {showRepairs && (
          <ActivityCard
            title="Recent Repairs"
            icon={<Wrench size={16} />}
            viewAllHref="/dashboard/repairs"
            isLoading={isLoading}
          >
            {summary?.recentRepairs && summary.recentRepairs.length > 0 ? (
              <Table highlightOnHover withRowBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Ticket</Table.Th>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary.recentRepairs.map((repair) => (
                    <Table.Tr key={repair.id}>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          href={`/dashboard/repairs/${repair.id}`}
                          size="xs"
                          style={{ fontFamily: "var(--mantine-font-family-monospace)" }}
                        >
                          {repair.repairTicketNumber}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" truncate style={{ maxWidth: 140 }}>
                          {repair.customer}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={repair.status} type="repair" size="xs" />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No repairs recorded yet.
              </Text>
            )}
          </ActivityCard>
        )}
      </SimpleGrid>
    </Stack>
  );
}

// ─── Activity card wrapper ────────────────────────────────────────────────────

function ActivityCard({
  title,
  icon,
  viewAllHref,
  isLoading,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  viewAllHref: string;
  isLoading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      <Group
        px="md"
        py="sm"
        justify="space-between"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
      >
        <Group gap="xs">
          <ThemeIcon
            size={28}
            radius="sm"
            style={{
              backgroundColor: "var(--mantine-color-indigo-0)",
              color: "var(--mantine-color-indigo-6)",
              border: "none",
            }}
          >
            {icon}
          </ThemeIcon>
          <Text fw={600} size="sm">
            {title}
          </Text>
        </Group>
        <Anchor
          component={Link}
          href={viewAllHref}
          size="xs"
          c="dimmed"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          View all <ArrowRight size={12} />
        </Anchor>
      </Group>

      <Box style={{ overflowX: "auto" }}>
        {isLoading ? (
          <Stack gap="xs" p="md">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={24} radius="sm" />
            ))}
          </Stack>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}
