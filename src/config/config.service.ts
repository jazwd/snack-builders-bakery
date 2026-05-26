export interface AppEnv {
  port: number;
  mongoUri: string;
  mongoDbName: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  authUsername: string;
  authPassword: string;
  ovenCount: number;
  slotsPerOven: number;
  seedMenuOnStart: boolean;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error('PORT must be a valid integer between 1 and 65535.');
  }

  return parsed;
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  envName: string,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `${envName} must be an integer greater than or equal to 1.`,
    );
  }

  return parsed;
}

function parseBoolean(
  value: string | undefined,
  fallback: boolean,
  envName: string,
): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(`${envName} must be either true or false.`);
}

export function getEnvConfig(): AppEnv {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is required. Please define it in your environment or .env file.',
    );
  }

  const mongoDbName = process.env.MONGODB_DB_NAME?.trim() || 'bakery';

  return {
    port: parsePort(process.env.PORT),
    mongoUri,
    mongoDbName,
    jwtSecret: process.env.JWT_SECRET?.trim() ?? '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '1h',
    authUsername: process.env.AUTH_USERNAME?.trim() ?? '',
    authPassword: process.env.AUTH_PASSWORD?.trim() ?? '',
    ovenCount: parsePositiveInt(process.env.OVEN_COUNT, 2, 'OVEN_COUNT'),
    slotsPerOven: parsePositiveInt(
      process.env.SLOTS_PER_OVEN,
      3,
      'SLOTS_PER_OVEN',
    ),
    seedMenuOnStart: parseBoolean(
      process.env.SEED_MENU_ON_START,
      true,
      'SEED_MENU_ON_START',
    ),
  };
}
