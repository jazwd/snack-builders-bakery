import type { SocketLike } from '../models/domain';
import { serializeOrder } from '../utils/serializers';
import { SystemClock } from '../utils/clock';
import {
  CashPaymentProcessor,
  CreditCardPaymentProcessor,
  PaymentService,
} from '../services/payment.service';
import { KitchenScheduler } from '../services/kitchenScheduler.service';
import { getDb } from '../config/mongo.service';
import { MongoBakeryRepository } from '../repositories/mongo-bakery.repository';

export const orderSubscribers = new Map<string, Set<SocketLike>>();

const paymentService = new PaymentService([
  new CashPaymentProcessor(),
  new CreditCardPaymentProcessor(),
]);

export let scheduler: KitchenScheduler;

function broadcastOrderChanged(
  order: Parameters<typeof serializeOrder>[0]
): void {
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

export async function initializeAppState(): Promise<void> {
  const db = await getDb();
  const repository = new MongoBakeryRepository(db);
  scheduler = new KitchenScheduler(
    new SystemClock(),
    paymentService,
    broadcastOrderChanged,
    repository
  );
  await scheduler.initialize();
}
