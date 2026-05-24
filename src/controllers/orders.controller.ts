import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  isPaymentMethod,
  isPriorityLevel,
  type PlaceOrderInput,
} from '../models/domain';
import { scheduler } from '../services/app-state';
import { round2, serializeOrder } from '../utils/serializers';

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
      websocket_tracking_url: `/api/ws/orders/${order.id}`,
    });
  } catch (error) {
    return reply.code(400).send({ error: (error as Error).message });
  }
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
