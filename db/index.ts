import { drizzle } from 'drizzle-orm/postgres-js';
import postgresInit from 'postgres';
import * as schema from './schema';

// Create the connection for queries
const connectionString = process.env.DATABASE_URL!;

declare global {
    var postgres: ReturnType<typeof postgresInit> | undefined;
}

// Disable prefetch as it's not supported for "Transaction" pool mode
const client = globalThis.postgres || postgresInit(connectionString, { prepare: false, max: 5 });

if (process.env.NODE_ENV !== 'production') {
    globalThis.postgres = client;
}

// Create the drizzle database instance
export const db = drizzle(client, { schema });

// Export schema for use in other files
export * from './schema';
