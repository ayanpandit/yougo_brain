import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const t of trips) {
    console.log(`=========================================`);
    console.log(`Trip ID: ${t.id} (GenID: ${t.generationId})`);
    console.log(`Destination: ${t.destination}`);
    console.log(`Status: ${t.status}`);
    console.log(`Created At: ${t.createdAt}`);
    console.log(`Metadata Telemetry:`, JSON.stringify(t.metadata, null, 2));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
