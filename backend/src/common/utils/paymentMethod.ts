import { PaymentMethod } from "../../generated/prisma/client.js";

// API Spec request bodies use lowercase/snake_case payment method strings
// ("cash", "bank_transfer") across Purchases (31.3), Sales (34.3), and
// Payments (36.2) — mapped here once to the schema's PaymentMethod enum.
export const PAYMENT_METHOD_INPUT_MAP: Record<string, PaymentMethod> = {
  cash: PaymentMethod.CASH,
  debit_card: PaymentMethod.DEBIT_CARD,
  credit_card: PaymentMethod.CREDIT_CARD,
  bank_transfer: PaymentMethod.BANK_TRANSFER,
  mobile_wallet: PaymentMethod.MOBILE_WALLET,
  mixed: PaymentMethod.MIXED_PAYMENT,
};

export const PAYMENT_METHOD_INPUT_VALUES = Object.keys(PAYMENT_METHOD_INPUT_MAP) as [string, ...string[]];
