import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { getEnvConfig } from '../config/config.service';

export async function login(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const env = getEnvConfig();

  const body = request.body as {
    username?: string;
    password?: string;
  };

  const normalizedUsername = body.username?.trim();
  const normalizedPassword = body.password?.trim();

  if (!normalizedUsername || !normalizedPassword) {
    return reply.code(400).send({
      message: 'Username and password are required',
    });
  }

  if (!env.jwtSecret || !env.authUsername || !env.authPassword) {
    return reply.code(500).send({
      message: 'JWT authentication is not configured correctly.',
    });
  }

  if (
    normalizedUsername !== env.authUsername ||
    normalizedPassword !== env.authPassword
  ) {
    return reply.code(401).send({
      message: 'Invalid credentials',
    });
  }

  const signOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };

  const token = jwt.sign(
    { sub: normalizedUsername },
    env.jwtSecret,
    signOptions,
  );

  return reply.code(200).send({
    message: 'Login successful',
    token,
    tokenType: 'Bearer',
    expiresIn: env.jwtExpiresIn,
  });
}
