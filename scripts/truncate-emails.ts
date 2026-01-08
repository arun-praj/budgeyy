
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '@/db';
import { transactionalEmails } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Truncating transactional_emails table...');
    try {
        await db.execute(sql`DELETE FROM ${transactionalEmails}`);
        console.log('Successfully deleted all rows.');
    } catch (e) {
        console.error('Error truncating:', e);
    }
    process.exit(0);
}

main();
