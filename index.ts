import 'dotenv/config';

import Fastify from 'fastify';

import { login } from './src/controllers/auth.controller';
import { getHealth } from './src/controllers/health.controller';
import { getMetrics } from './src/controllers/metrics.controller';
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
  getOrderStatusByTicketNumber,
  getOrderTasks,
  getOrders,
  updateOrder,
} from './src/controllers/orders.controller';
import { initializeAppState } from './src/app/app-state';
import { getEnvConfig } from './src/config/config.service';
import { authenticateRequest } from './src/middleware/auth.middleware';

const app = Fastify({ logger: true });
const API_PREFIX = '/api';

app.get(`${API_PREFIX}/health`, getHealth);
app.get('/metrics', getMetrics);
app.post(`${API_PREFIX}/auth/login`, login);

app.get(`${API_PREFIX}/menu`, { preHandler: authenticateRequest }, getMenu);
app.post(
  `${API_PREFIX}/menu`,
  { preHandler: authenticateRequest },
  createMenuItem,
);
app.put(
  `${API_PREFIX}/menu/:id`,
  { preHandler: authenticateRequest },
  updateMenuItem,
);
app.delete(
  `${API_PREFIX}/menu/:id`,
  { preHandler: authenticateRequest },
  deleteMenuItem,
);

app.post(
  `${API_PREFIX}/orders`,
  { preHandler: authenticateRequest },
  createOrder,
);
app.get(`${API_PREFIX}/orders`, { preHandler: authenticateRequest }, getOrders);
app.get(
  `${API_PREFIX}/orders/ticket/:ticketNumber/status`,
  { preHandler: authenticateRequest },
  getOrderStatusByTicketNumber,
);
app.get(
  `${API_PREFIX}/orders/:orderId`,
  { preHandler: authenticateRequest },
  getOrderById,
);
app.get(
  `${API_PREFIX}/orders/:orderId/tasks`,
  { preHandler: authenticateRequest },
  getOrderTasks,
);
app.patch(
  `${API_PREFIX}/orders/:orderId`,
  { preHandler: authenticateRequest },
  updateOrder,
);

app.get(
  `${API_PREFIX}/kitchen/status`,
  { preHandler: authenticateRequest },
  getKitchenStatus,
);

async function startServer(): Promise<void> {
  const env = getEnvConfig();
  await initializeAppState(env);
  await app.listen({ port: env.port, host: '0.0.0.0' });
}

void startServer().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
