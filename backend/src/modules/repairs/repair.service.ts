import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const repairListInclude = {
  customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
  product: { select: { id: true, sku: true, productName: true } },
  imeiNumber: { select: { id: true, imeiNumber: true } },
  technician: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.RepairInclude;

type RepairListRow = Prisma.RepairGetPayload<{ include: typeof repairListInclude }>;

function toRepairListItem(repair: RepairListRow) {
  return {
    id: repair.id,
    repairTicketNumber: repair.repairTicketNumber,
    customerId: repair.customer.id,
    customer: [repair.customer.firstName, repair.customer.lastName].filter(Boolean).join(" "),
    customerPhone: repair.customer.phone,
    device: repair.product?.productName ?? null,
    imei: repair.imeiNumber?.imeiNumber ?? null,
    technician: repair.technician
      ? [repair.technician.firstName, repair.technician.lastName].filter(Boolean).join(" ")
      : null,
    problemDescription: repair.problemDescription,
    estimatedCost: repair.estimatedCost,
    actualCost: repair.actualCost,
    status: repair.repairStatus,
    receivedDate: repair.receivedDate,
    expectedDeliveryDate: repair.expectedDeliveryDate,
    deliveredDate: repair.deliveredDate,
  };
}

const repairDetailInclude = {
  ...repairListInclude,
  items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
} satisfies Prisma.RepairInclude;

type RepairDetailRow = Prisma.RepairGetPayload<{ include: typeof repairDetailInclude }>;

function toRepairDetailDto(repair: RepairDetailRow) {
  return {
    ...toRepairListItem(repair),
    diagnosis: repair.diagnosis,
    remarks: repair.remarks,
    items: repair.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    createdAt: repair.createdAt,
    updatedAt: repair.updatedAt,
  };
}

export type RepairStatusValue =
  | "RECEIVED"
  | "UNDER_INSPECTION"
  | "WAITING_FOR_PARTS"
  | "IN_PROGRESS"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface ListRepairsInput extends PaginationQuery {
  customerId?: string;
  technicianId?: string;
  status?: RepairStatusValue;
}

/** GET /api/v1/repairs — "Repair History" (SRS Module 19). */
export async function listRepairs(input: ListRepairsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.RepairWhereInput = {
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.technicianId ? { technicianId: input.technicianId } : {}),
    ...(input.status ? { repairStatus: input.status } : {}),
  };

  const [repairs, total] = await Promise.all([
    prisma.repair.findMany({ where, skip, take, orderBy: { receivedDate: "desc" }, include: repairListInclude }),
    prisma.repair.count({ where }),
  ]);

  return { data: repairs.map(toRepairListItem), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getRepairById(id: string) {
  const repair = await prisma.repair.findUnique({ where: { id }, include: repairDetailInclude });
  if (!repair) throw new NotFoundError("Repair not found.");
  return toRepairDetailDto(repair);
}

export interface CreateRepairInput {
  customerId: string;
  device?: string;
  productId?: string;
  imei?: string;
  problem: string;
  technicianId?: string;
  estimatedCost?: number;
  expectedDeliveryDate?: Date;
}

/**
 * POST /api/v1/repairs (API Spec Chapter 41.1). The spec's example sends a
 * free-text "device" name and "imei" rather than the DDD's structured
 * productId/imeiId FKs — repair shops routinely service devices the
 * customer bought elsewhere, so both are treated as optional/best-effort:
 * imei is only linked (imeiId) when it matches a unit this shop has on
 * record, and the free-text device/imei are always preserved in remarks so
 * nothing typed by the technician is lost.
 */
export async function createRepair(input: CreateRepairInput) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("Customer not found.");

  if (input.technicianId) {
    const technician = await prisma.employee.findUnique({ where: { id: input.technicianId } });
    if (!technician) throw new NotFoundError("Technician not found.");
  }

  let imeiId: string | undefined;
  if (input.imei) {
    const imeiRecord = await prisma.imeiNumber.findUnique({ where: { imeiNumber: input.imei } });
    if (imeiRecord) imeiId = imeiRecord.id;
  }

  const remarksParts: string[] = [];
  if (input.device) remarksParts.push(`Device: ${input.device}`);
  if (input.imei && !imeiId) remarksParts.push(`IMEI (unregistered): ${input.imei}`);

  const repair = await prisma.repair.create({
    data: {
      repairTicketNumber: generateCode("RPR"),
      customerId: input.customerId,
      ...(input.productId !== undefined ? { productId: input.productId } : {}),
      ...(imeiId !== undefined ? { imeiId } : {}),
      ...(input.technicianId !== undefined ? { technicianId: input.technicianId } : {}),
      problemDescription: input.problem,
      ...(input.estimatedCost !== undefined ? { estimatedCost: input.estimatedCost } : {}),
      ...(input.expectedDeliveryDate !== undefined ? { expectedDeliveryDate: input.expectedDeliveryDate } : {}),
      ...(remarksParts.length > 0 ? { remarks: remarksParts.join(" · ") } : {}),
    },
    include: repairDetailInclude,
  });

  return toRepairDetailDto(repair);
}

/** PATCH /api/v1/repairs/{id}/status (API Spec Chapter 41.2). */
export async function updateRepairStatus(id: string, status: RepairStatusValue) {
  const repair = await prisma.repair.findUnique({ where: { id } });
  if (!repair) throw new NotFoundError("Repair not found.");
  if (repair.repairStatus === "DELIVERED") throw new ConflictError("This repair has already been delivered.");
  if (repair.repairStatus === "CANCELLED") throw new ConflictError("This repair has been cancelled.");

  const updated = await prisma.repair.update({
    where: { id },
    data: {
      repairStatus: status,
      // "Deliver Device" (SRS Module 19) — stamp the delivery timestamp
      // automatically the moment status transitions to DELIVERED.
      ...(status === "DELIVERED" ? { deliveredDate: new Date() } : {}),
    },
    include: repairDetailInclude,
  });

  return toRepairDetailDto(updated);
}

export interface UpdateRepairInput {
  diagnosis?: string;
  technicianId?: string;
  estimatedCost?: number;
  actualCost?: number;
  expectedDeliveryDate?: Date;
  remarks?: string;
}

/** PATCH /api/v1/repairs/{id} — diagnosis, cost, technician assignment, notes. */
export async function updateRepair(id: string, input: UpdateRepairInput) {
  const existing = await prisma.repair.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Repair not found.");

  if (input.technicianId) {
    const technician = await prisma.employee.findUnique({ where: { id: input.technicianId } });
    if (!technician) throw new NotFoundError("Technician not found.");
  }

  const repair = await prisma.repair.update({
    where: { id },
    data: {
      ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis } : {}),
      ...(input.technicianId !== undefined ? { technicianId: input.technicianId } : {}),
      ...(input.estimatedCost !== undefined ? { estimatedCost: input.estimatedCost } : {}),
      ...(input.actualCost !== undefined ? { actualCost: input.actualCost } : {}),
      ...(input.expectedDeliveryDate !== undefined ? { expectedDeliveryDate: input.expectedDeliveryDate } : {}),
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
    },
    include: repairDetailInclude,
  });

  return toRepairDetailDto(repair);
}

export interface AddRepairItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * POST /api/v1/repairs/{id}/items — "Record Parts Used" (SRS Module 19).
 * Consumes stock the same way a sale line does; actualCost stays a
 * separately-editable running total (via updateRepair) since it also
 * covers labor, which has no dedicated column in DDD Table 27.
 */
export async function addRepairItem(id: string, input: AddRepairItemInput) {
  const repair = await prisma.repair.findUnique({ where: { id } });
  if (!repair) throw new NotFoundError("Repair not found.");

  const product = await prisma.product.findUnique({ where: { id: input.productId }, include: { inventory: true } });
  if (!product) throw new NotFoundError("Product not found.");

  const available = product.inventory?.availableQuantity ?? 0;
  if (available < input.quantity) {
    throw new BadRequestError(`Insufficient stock for "${product.productName}" (available: ${available}).`);
  }

  const totalPrice = input.quantity * input.unitPrice;

  await prisma.$transaction(async (tx) => {
    await tx.repairItem.create({
      data: { repairId: id, productId: input.productId, quantity: input.quantity, unitPrice: input.unitPrice, totalPrice },
    });

    const inventory = await tx.inventory.update({
      where: { productId: input.productId },
      data: { quantity: { decrement: input.quantity }, availableQuantity: { decrement: input.quantity } },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        productId: input.productId,
        transactionType: "REPAIR",
        quantity: -input.quantity,
        referenceNumber: repair.repairTicketNumber,
      },
    });
  });

  return getRepairById(id);
}
