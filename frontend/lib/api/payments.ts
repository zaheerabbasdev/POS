import { apiClient } from "../api-client";

export interface PaymentInput {
  type: "customer" | "supplier";
  referenceId: string;
  amount: number;
  method: string;
  notes?: string;
}

export interface Payment {
  id: string;
  type: "customer" | "supplier";
  referenceId: string;
  amount: string;
  method: string;
  date: string;
  notes: string | null;
}

// POST /api/v1/payments (API Spec Chapter 36.2) — records an additional
// payment against an existing sale/purchase beyond the one taken at
// creation time.
export async function createPayment(input: PaymentInput): Promise<Payment> {
  const { data } = await apiClient.post<{ data: Payment }>("/payments", input);
  return data.data;
}
