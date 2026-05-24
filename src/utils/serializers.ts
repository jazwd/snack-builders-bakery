import type { Order } from '../models/domain';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function serializeOrder(order: Order): Record<string, unknown> {
  return {
    order_id: order.id,
    ticket_number: order.ticketNumber,
    status: order.status,
    priority_level: order.priorityLevel,
    payment_method: order.paymentMethod,
    total_price: round2(order.totalPrice),
    estimated_ready_time: new Date(order.estimatedReadyAt).toISOString(),
    created_at: new Date(order.createdAt).toISOString(),
    updated_at: new Date(order.updatedAt).toISOString(),
    delivered_at: order.deliveredAt
      ? new Date(order.deliveredAt).toISOString()
      : null,
    item_lines: order.itemLines.map((line) => ({
      ...line,
      unitPrice: round2(line.unitPrice),
      lineTotal: round2(line.lineTotal),
    })),
  };
}
