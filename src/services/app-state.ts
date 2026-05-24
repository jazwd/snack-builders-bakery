import type { SocketLike } from '../models/domain';
import { serializeOrder } from '../utils/serializers';
import { SystemClock } from '../utils/clock';
import {
  CashPaymentProcessor,
  CreditCardPaymentProcessor,
  PaymentService,
} from './payment.service';
import { KitchenScheduler } from './kitchen-scheduler.service';

export const orderSubscribers = new Map<string, Set<SocketLike>>();

const paymentService = new PaymentService([
  new CashPaymentProcessor(),
  new CreditCardPaymentProcessor(),
]);

export const scheduler = new KitchenScheduler(
  new SystemClock(),
  paymentService,
  (order) => {
    const subscribers = orderSubscribers.get(order.id);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const payload = JSON.stringify({
      type: 'order_status_changed',
      data: serializeOrder(order),
    });

    for (const socket of subscribers) {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    }
  }
);
