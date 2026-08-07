// Base UI's <Select.Root items={...}> map is how it resolves a pre-filled
// value's display label without having to mount every <Select.Item> first
// (see components/ui/select.tsx). Every Select with a default or pre-filled
// value needs one of these — otherwise it shows the raw value (e.g. "active")
// instead of the label until the user opens the dropdown at least once.
export const STATUS_ITEMS = { active: "Active", inactive: "Inactive" };

export const STOCK_STATUS_ITEMS = {
  all: "All stock levels",
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

export const ADJUSTMENT_TYPE_ITEMS = { increase: "Increase", decrease: "Decrease" };

// Must match backend/src/common/utils/paymentMethod.ts PAYMENT_METHOD_INPUT_MAP keys.
export const PAYMENT_METHOD_ITEMS = {
  cash: "Cash",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
  mobile_wallet: "Mobile Wallet",
  mixed: "Mixed Payment",
};

export const CUSTOMER_TYPE_ITEMS = {
  REGULAR: "Regular",
  WHOLESALE: "Wholesale",
  VIP: "VIP",
  CORPORATE: "Corporate",
};

export const REPAIR_STATUS_ITEMS = {
  RECEIVED: "Received",
  UNDER_INSPECTION: "Under Inspection",
  WAITING_FOR_PARTS: "Waiting for Parts",
  IN_PROGRESS: "In Progress",
  READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
