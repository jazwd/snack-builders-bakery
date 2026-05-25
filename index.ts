import 'dotenv/config';

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
import {
  createOrder,
  getOrderById,
  getOrderTasks,
  getOrders,
  updateOrder,
} from './src/controllers/orders.controller';
import { subscribeOrderStatus } from './src/controllers/order-ws.controller';
import { initializeAppState } from './src/app/app-state';
import { getEnvConfig } from './src/config/config.service';

const app = Fastify({ logger: true });
const API_PREFIX = '/api';

void app.register(websocketPlugin);

app.get(`${API_PREFIX}/health`, getHealth);

app.get(`${API_PREFIX}/menu`, getMenu);
app.post(`${API_PREFIX}/menu`, createMenuItem);
app.put(`${API_PREFIX}/menu/:id`, updateMenuItem);
app.delete(`${API_PREFIX}/menu/:id`, deleteMenuItem);

app.post(`${API_PREFIX}/orders`, createOrder);
app.get(`${API_PREFIX}/orders`, getOrders);
app.get(`${API_PREFIX}/orders/:orderId`, getOrderById);
app.get(`${API_PREFIX}/orders/:orderId/tasks`, getOrderTasks);
app.patch(`${API_PREFIX}/orders/:orderId`, updateOrder);

app.get(`${API_PREFIX}/kitchen/status`, getKitchenStatus);

app.get(
  `${API_PREFIX}/ws/orders/:orderId`,
  { websocket: true },
  subscribeOrderStatus
);

async function startServer(): Promise<void> {
  const env = getEnvConfig();
  await initializeAppState();
  await app.listen({ port: env.port, host: '0.0.0.0' });
}

void startServer().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
