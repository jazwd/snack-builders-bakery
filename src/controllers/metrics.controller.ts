import type { FastifyReply, FastifyRequest } from 'fastify';
import { Registry, collectDefaultMetrics } from 'prom-client';

declare global {
  var __bakeryMetricsRegistry: Registry | undefined;
}

function getRegistry(): Registry {
  if (global.__bakeryMetricsRegistry) {
    return global.__bakeryMetricsRegistry;
  }

  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  global.__bakeryMetricsRegistry = registry;
  return registry;
}

export async function getMetrics(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const registry = getRegistry();
  reply.header('Content-Type', registry.contentType);
  return reply.send(await registry.metrics());
}
