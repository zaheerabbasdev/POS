import { apiClient } from "../api-client";

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  designation: string | null;
  salary: string | null;
  joiningDate: string;
  status: "ACTIVE" | "INACTIVE";
  profileImage: string | null;
  createdAt: string;
}

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface EmployeeInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  designation?: string;
  salary?: number;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/employees (API Spec Chapter 29.1).
export async function fetchEmployees(params: EmployeeListParams = {}): Promise<Paginated<Employee>> {
  const { data } = await apiClient.get<Paginated<Employee>>("/employees", { params });
  return data;
}

// GET /api/v1/employees/{id}.
export async function fetchEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.get<{ data: Employee }>(`/employees/${id}`);
  return data.data;
}

// POST /api/v1/employees (API Spec Chapter 29.2).
export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const { data } = await apiClient.post<{ data: Employee }>("/employees", input);
  return data.data;
}

// PATCH /api/v1/employees/{id} (API Spec Chapter 29.3).
export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput & { status: "ACTIVE" | "INACTIVE" }>,
): Promise<Employee> {
  const { data } = await apiClient.patch<{ data: Employee }>(`/employees/${id}`, input);
  return data.data;
}

// DELETE /api/v1/employees/{id} — soft delete (deactivate).
export async function deactivateEmployee(id: string): Promise<void> {
  await apiClient.delete(`/employees/${id}`);
}
