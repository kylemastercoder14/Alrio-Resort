import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const cachedPrisma = globalForPrisma.prisma;
// Bump this whenever the generated Prisma schema changes so Next.js dev HMR
// does not reuse a global client created from an older runtime data model.
const schemaVersion = "20261107084754_add_guest_account_status";
const hasCurrentDelegates =
  cachedPrisma &&
  globalForPrisma.prismaSchemaVersion === schemaVersion &&
  "resortReservation" in cachedPrisma &&
  "resortService" in cachedPrisma &&
  "resortInvoice" in cachedPrisma &&
  "resortFinanceEntry" in cachedPrisma;

export const prisma =
  cachedPrisma && hasCurrentDelegates ? cachedPrisma : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = schemaVersion;
}
