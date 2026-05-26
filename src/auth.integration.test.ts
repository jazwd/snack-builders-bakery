import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { login } from './controllers/auth.controller';
import { authenticateRequest } from './middleware/auth.middleware';

describe('JWT auth integration', () => {
  let app: FastifyInstance;
  const originalEnv = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  };

  beforeEach(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'change_this_password';

    app = Fastify();

    app.post('/api/auth/login', login);
    app.get(
      '/api/protected',
      { preHandler: authenticateRequest },
      async () => ({ ok: true }),
    );

    await app.ready();
  });

  afterEach(async () => {
    await app.close();

    process.env.MONGODB_URI = originalEnv.MONGODB_URI;
    process.env.JWT_SECRET = originalEnv.JWT_SECRET;
    process.env.JWT_EXPIRES_IN = originalEnv.JWT_EXPIRES_IN;
    process.env.AUTH_USERNAME = originalEnv.AUTH_USERNAME;
    process.env.AUTH_PASSWORD = originalEnv.AUTH_PASSWORD;
  });

  it('returns a JWT token for valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'admin',
        password: 'change_this_password',
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      token?: string;
      tokenType?: string;
      expiresIn?: string;
    };

    expect(body.token).toBeTypeOf('string');
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe('1h');
  });

  it('rejects protected route access without Bearer token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/protected',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: 'Missing Bearer token' });
  });

  it('allows protected route access with a valid Bearer token', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'admin',
        password: 'change_this_password',
      },
    });

    const loginBody = loginResponse.json() as { token: string };

    const protectedResponse = await app.inject({
      method: 'GET',
      url: '/api/protected',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });

    expect(protectedResponse.statusCode).toBe(200);
    expect(protectedResponse.json()).toEqual({ ok: true });
  });
});
