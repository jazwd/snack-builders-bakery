import type { FastifyRequest } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { scheduler, orderSubscribers } from '../app/app-state';

export function subscribeOrderStatus(
  connection: SocketStream,
  request: FastifyRequest
): void {
  const params = request.params as { orderId: string };
  const order = scheduler.getOrder(params.orderId);

  if (!order) {
    connection.socket.send(JSON.stringify({ error: 'Order not found.' }));
    connection.socket.close();
    return;
  }

  const subscribers = orderSubscribers.get(order.id) ?? new Set();
  subscribers.add(connection.socket);
  orderSubscribers.set(order.id, subscribers);

  connection.socket.send(
    JSON.stringify({
      type: 'order_status_snapshot',
      data: {
        order_id: order.id,
        ticket_number: order.ticketNumber,
        status: order.status,
        priority_level: order.priorityLevel,
        payment_method: order.paymentMethod,
        total_price: order.totalPrice,
        estimated_ready_time: new Date(order.estimatedReadyAt).toISOString(),
      },
    })
  );

  connection.socket.on('close', () => {
    const currentSubscribers = orderSubscribers.get(order.id);
    if (!currentSubscribers) {
      return;
    }
    currentSubscribers.delete(connection.socket);
    if (currentSubscribers.size === 0) {
      orderSubscribers.delete(order.id);
    }
  });
}
