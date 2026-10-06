/**
 * Anonymizes customer PII in the Training database after a Live -> Training data refresh.
 *
 * Isolated, offline, admin-triggered utility - not wired into any server route or request
 * path. Run manually from the CLI after restoring a Training database from a Live snapshot:
 *
 *   MSPL_RUNTIME_ENV=training node scripts/anonymize-training-data.js
 *
 * Refuses to run unless both the runtime environment and the target database name
 * unambiguously identify themselves as Training, so it can never be pointed at Live data.
 */
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

function assertTrainingTarget() {
  const runtimeEnv = (process.env.MSPL_RUNTIME_ENV ?? '').trim().toLowerCase();
  if (runtimeEnv !== 'training') {
    throw new Error(
      'Refusing to run: MSPL_RUNTIME_ENV must be set to "training". This script must never run against Live.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(new URL(databaseUrl).pathname).replace(/^\/+|\/+$/g, '');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string.');
  }

  if (!/(^|[_-])training([_-]|$)/i.test(databaseName)) {
    throw new Error(
      `Refusing to run: DATABASE_URL database name "${databaseName}" does not identify itself as a training database.`
    );
  }
}

function deterministicDigits(seed, length) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const digits = BigInt('0x' + hash.slice(0, 16)) % BigInt(10 ** length);
  return digits.toString().padStart(length, '0');
}

function anonymizeCustomer(customer) {
  const shortId = customer.id.slice(0, 8);
  return {
    name: `Training Customer ${shortId}`,
    registeredMobile: `9${deterministicDigits(customer.id + ':mobile', 9)}`,
    alternateMobile: null,
    whatsAppNumber: null,
    email: customer.email ? `customer.${shortId}@training.invalid` : null,
    address: customer.address ? 'Anonymized Training Address' : null,
  };
}

async function run() {
  assertTrainingTarget();

  const prisma = new PrismaClient();
  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, email: true, address: true },
    });

    let updated = 0;
    for (const customer of customers) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: anonymizeCustomer(customer),
      });
      updated += 1;
    }

    console.log(`Training data anonymization complete: ${updated} customer record(s) anonymized.`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(`Training data anonymization FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
