export interface AppEnv {
  port: number;
  mongoUri: string;
  mongoDbName: string;
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

export function getEnvConfig(): AppEnv {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is required. Please define it in your environment or .env file.'
    );
  }

  const mongoDbName = process.env.MONGODB_DB_NAME?.trim() || 'bakery';

  return {
    port: parsePort(process.env.PORT),
    mongoUri,
    mongoDbName,
  };
}
