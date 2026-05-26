import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getEnvConfig } from '../config/config.service';

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authorization = request.headers.authorization;
  const env = getEnvConfig();

  if (!env.jwtSecret) {
    await reply.code(500).send({
      message:
        'JWT security is not configured. Add JWT_SECRET to the environment.',
    });
    return;
  }

  if (!authorization?.startsWith('Bearer ')) {
    await reply.code(401).send({
      message: 'Missing Bearer token',
    });
    return;
  }

  const token = authorization.slice(7);

  try {
    jwt.verify(token, env.jwtSecret);
  } catch {
    await reply.code(401).send({
      message: 'Invalid or expired token',
    });
  }
}
