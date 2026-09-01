"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Pencil } from "lucide-react";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Text,
  Badge,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { fetchEmployees, type Employee } from "@/lib/api/employees";
import { EmployeeFormDialog } from "./employee-form-dialog";

const PAGE_SIZE = 50;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", { search, page }],
    queryFn: () => fetchEmployees({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const openCreate = () => {
    setEditingEmployee(undefined);
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Employees"
        description="Manage shop staff — technicians, cashiers, and other employees."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Employee
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search by name, phone, or code…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle={search ? "No matching employees" : "No employees yet"}
          emptyDescription={
            search
              ? "No employees match your search."
              : "Add your first employee."
          }
          columns={[
            {
              key: "code",
              header: "Code",
              render: (e) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {e.employeeCode}
                </Text>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (e) => (
                <Text size="sm" fw={500}>
                  {e.name}
                </Text>
              ),
            },
            {
              key: "phone",
              header: "Phone",
              render: (e) => (
                <Text size="sm" c="dimmed">
                  {e.phone ?? "—"}
                </Text>
              ),
            },
            {
              key: "designation",
              header: "Designation",
              render: (e) => (
                <Text size="sm">
                  {e.designation ?? "—"}
                </Text>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (e) => (
                <Badge
                  color={e.status === "ACTIVE" ? "green" : "gray"}
                  variant="light"
                  size="sm"
                >
                  {e.status === "ACTIVE" ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (e) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(e),
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        {data && (
          <Box style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
            <PaginationControls
              page={page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </Box>
        )}
      </Paper>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editingEmployee} />
    </Stack>
  );
}
