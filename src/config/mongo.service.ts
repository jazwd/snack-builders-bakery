import { MongoClient, type Db } from 'mongodb';
import { getEnvConfig } from './config.service';

let client: MongoClient | undefined;
let db: Db | undefined;

export async function getDb(): Promise<Db> {
  if (db) {
    return db;
  }

  const env = getEnvConfig();

  client = new MongoClient(env.mongoUri);
  await client.connect();
  db = client.db(env.mongoDbName);
  return db;
}

export async function pingMongo(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeMongoConnection(): Promise<void> {
  if (!client) {
    return;
  }

  await client.close();
  client = undefined;
  db = undefined;
}
