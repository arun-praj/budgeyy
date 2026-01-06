import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = globalThis.postgres || postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.postgres = client;
}

export const db = drizzle(client, { schema });
export * from './schema';
