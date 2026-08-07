import { apiClient } from "../api-client";

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  categoryId: string;
  category: string;
  amount: string;
  paymentMethod: string;
  expenseDate: string;
  recordedBy: string | null;
  description: string | null;
  createdAt: string;
}

export interface ExpenseListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  paymentMethod?: string;
  expenseDate?: string;
  description?: string;
}

export interface UpdateExpenseInput {
  amount?: number;
  paymentMethod?: string;
  expenseDate?: string;
  description?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/expenses/categories
export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await apiClient.get<{ data: ExpenseCategory[] }>("/expenses/categories");
  return data.data;
}

// GET /api/v1/expenses (API Spec Chapter 43.1).
export async function fetchExpenses(params: ExpenseListParams = {}): Promise<Paginated<Expense>> {
  const { data } = await apiClient.get<Paginated<Expense>>("/expenses", { params });
  return data;
}

// POST /api/v1/expenses (API Spec Chapter 43.2).
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.post<{ data: Expense }>("/expenses", input);
  return data.data;
}

// PATCH /api/v1/expenses/{id}.
export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.patch<{ data: Expense }>(`/expenses/${id}`, input);
  return data.data;
}

// DELETE /api/v1/expenses/{id}.
export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
