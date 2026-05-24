import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';

import { getHealth } from './src/controllers/health.controller';
import {
  createMenuItem,
  deleteMenuItem,
  getMenu,
  updateMenuItem,
} from './src/controllers/menu.controller';
import { getKitchenStatus } from './src/controllers/kitchen.controller';
import { createOrder, getOrderById } from './src/controllers/orders.controller';
import { subscribeOrderStatus } from './src/controllers/order-ws.controller';

const app = Fastify({ logger: true });

void app.register(websocketPlugin);

app.get('/health', getHealth);

app.get('/menu', getMenu);
app.post('/menu', createMenuItem);
app.put('/menu/:id', updateMenuItem);
app.delete('/menu/:id', deleteMenuItem);

app.post('/orders', createOrder);
app.get('/orders/:orderId', getOrderById);

app.get('/kitchen/status', getKitchenStatus);

app.get('/ws/orders/:orderId', { websocket: true }, subscribeOrderStatus);

async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? '3000');
  await app.listen({ port, host: '0.0.0.0' });
}

void startServer().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
