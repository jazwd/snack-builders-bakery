import type { Order, Task } from '../models/domain';

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

export function serializeTask(task: Task): Record<string, unknown> {
  return {
    task_id: task.id,
    order_id: task.orderId,
    menu_item_id: task.menuItemId,
    menu_item_name: task.menuItemName,
    category: task.category,
    bake_minutes: task.bakeMinutes,
    priority_level: task.priorityLevel,
    sequence: task.sequence,
    status: task.status,
    oven_id: typeof task.ovenId === 'number' ? task.ovenId : null,
    slot_index: typeof task.slotIndex === 'number' ? task.slotIndex + 1 : null,
    queued_at: new Date(task.queuedAt).toISOString(),
    baking_started_at: task.bakingStartedAt
      ? new Date(task.bakingStartedAt).toISOString()
      : null,
    expected_done_at: task.expectedDoneAt
      ? new Date(task.expectedDoneAt).toISOString()
      : null,
    done_at: task.doneAt ? new Date(task.doneAt).toISOString() : null,
    estimated_start_at: task.estimatedStartAt
      ? new Date(task.estimatedStartAt).toISOString()
      : null,
    estimated_end_at: task.estimatedEndAt
      ? new Date(task.estimatedEndAt).toISOString()
      : null,
  };
}
