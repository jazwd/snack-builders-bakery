import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  isPaymentMethod,
  isPriorityLevel,
  type OrderStatus,
  type PlaceOrderInput,
} from '../models/domain';
import { scheduler } from '../app/app-state';
import { round2, serializeOrder, serializeTask } from '../utils/serializers';

const ORDER_STATUSES: OrderStatus[] = [
  'queued',
  'baking',
  'delivery',
  'canceled',
];

export async function getOrders(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const query = request.query as { status?: string };

  if (query.status && !ORDER_STATUSES.includes(query.status as OrderStatus)) {
    return reply
      .code(400)
      .send({ error: 'status must be queued, baking, delivery, or canceled.' });
  }

  const orders = scheduler.listOrders(query.status as OrderStatus | undefined);
  return reply.send({ items: orders.map(serializeOrder) });
}

export async function createOrder(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const body = request.body as Partial<PlaceOrderInput>;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return reply.code(400).send({ error: 'items must be a non-empty array.' });
  }

  if (!isPaymentMethod(body.paymentMethod)) {
    return reply
      .code(400)
      .send({ error: 'paymentMethod must be cash or credit_card.' });
  }

  if (!isPriorityLevel(body.priorityLevel)) {
    return reply.code(400).send({
      error: 'priorityLevel must be 1 (VIP), 2 (App/Delivery), or 3 (Walk-in).',
    });
  }

  try {
    const order = await scheduler.placeOrder({
      items: body.items,
      paymentMethod: body.paymentMethod,
      priorityLevel: body.priorityLevel,
    });

    return reply.code(201).send({
      ticket_number: order.ticketNumber,
      order_id: order.id,
      total_price: round2(order.totalPrice),
      estimated_ready_time: new Date(order.estimatedReadyAt).toISOString(),
      status: order.status,
      status_tracking_url: `/api/orders/ticket/${order.ticketNumber}/status`,
    });
  } catch (error) {
    return reply.code(400).send({ error: (error as Error).message });
  }
}

export async function getOrderStatusByTicketNumber(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = request.params as { ticketNumber: string };
  const ticketNumber = Number(params.ticketNumber);

  if (!Number.isInteger(ticketNumber) || ticketNumber < 1) {
    return reply
      .code(400)
      .send({ error: 'ticketNumber must be a positive integer.' });
  }

  const order = scheduler.getOrderByTicketNumber(ticketNumber);
  if (!order) {
    return reply.code(404).send({ error: 'Order not found.' });
  }

  return reply.send({
    ticket_number: order.ticketNumber,
    order_id: order.id,
    status: order.status,
    priority_level: order.priorityLevel,
    estimated_ready_time: new Date(order.estimatedReadyAt).toISOString(),
    delivered_at: order.deliveredAt
      ? new Date(order.deliveredAt).toISOString()
      : null,
    updated_at: new Date(order.updatedAt).toISOString(),
  });
}

export async function getOrderById(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = request.params as { orderId: string };
  const order = scheduler.getOrder(params.orderId);
  if (!order) {
    return reply.code(404).send({ error: 'Order not found.' });
  }

  return reply.send(serializeOrder(order));
}

export async function getOrderTasks(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = request.params as { orderId: string };
  const order = scheduler.getOrder(params.orderId);
  if (!order) {
    return reply.code(404).send({ error: 'Order not found.' });
  }

  const tasks = scheduler.listOrderTasks(params.orderId);
  return reply.send({ items: tasks.map(serializeTask) });
}

export async function updateOrder(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = request.params as { orderId: string };
  const body = request.body as { status?: string };

  if (!body.status || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
    return reply
      .code(400)
      .send({ error: 'status must be queued, baking, delivery, or canceled.' });
  }

  try {
    const order = await scheduler.updateOrderStatus(
      params.orderId,
      body.status as OrderStatus
    );
    return reply.send(serializeOrder(order));
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Order not found') {
      return reply.code(404).send({ error: message });
    }
    return reply.code(400).send({ error: message });
  }
}
