import { pingMongo } from '../config/mongo.service';

export async function getHealth(): Promise<Record<string, string | boolean>> {
  const mongoConnected = await pingMongo();

  return {
    status: mongoConnected ? 'ok' : 'degraded',
    service: 'snack-builder-bakery-api',
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    ready: mongoConnected,
  };
}
