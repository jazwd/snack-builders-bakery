import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Category } from '../models/domain';
import { isCategory } from '../models/domain';
import { scheduler } from '../services/app-state';

export async function getMenu(): Promise<{
  items: ReturnType<typeof scheduler.listMenu>;
}> {
  return { items: scheduler.listMenu() };
}

export async function createMenuItem(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const body = request.body as Partial<{
    name: string;
    category: Category;
    price: number;
  }>;

  if (
    !body.name ||
    !isCategory(body.category) ||
    typeof body.price !== 'number' ||
    body.price <= 0
  ) {
    return reply.code(400).send({
      error:
        'Invalid payload. name, category, and positive price are required.',
    });
  }

  const item = await scheduler.createMenuItem({
    name: body.name,
    category: body.category,
    price: body.price,
  });

  return reply.code(201).send(item);
}

export async function updateMenuItem(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = request.params as { id: string };
  const body = request.body as Partial<{
    name: string;
    category: Category;
    price: number;
    active: boolean;
  }>;

  if (body.category && !isCategory(body.category)) {
    return reply.code(400).send({ error: 'Invalid category.' });
  }

  if (typeof body.price === 'number' && body.price <= 0) {
    return reply.code(400).send({ error: 'Price must be greater than 0.' });
  }

  try {
    const updated = await scheduler.updateMenuItem(params.id, body);
    return reply.send(updated);
  } catch (error) {
    return reply.code(404).send({ error: (error as Error).message });
  }
}

export async function deleteMenuItem(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = request.params as { id: string };
  try {
    await scheduler.removeMenuItem(params.id);
    return reply.code(204).send();
  } catch (error) {
    return reply.code(404).send({ error: (error as Error).message });
  }
}
