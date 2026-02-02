
import { db } from '@/db';
import { trips } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';

async function main() {
    const result = await db.select({ shareId: trips.shareId }).from(trips).where(isNotNull(trips.shareId)).limit(1);
    console.log('SHARE_ID:', result[0]?.shareId || 'No share ID found');
    process.exit(0);
}

main();
