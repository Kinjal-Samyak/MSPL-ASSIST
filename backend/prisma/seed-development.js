/* Development-only, idempotent dataset. Never run this against production. */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const hubs = [{ name: 'Hub 1', city: 'Kolkata', state: 'West Bengal' }, { name: 'Hub 2', city: 'Kolkata', state: 'West Bengal' }];
const models = [{ modelCode: 'URBN', displayName: 'URBN', vehicleType: 'Micro Mobility' }, { modelCode: 'HUM', displayName: 'HUM', vehicleType: 'Micro Mobility' }, { modelCode: 'M7', displayName: 'M7', vehicleType: 'High Speed' }, { modelCode: 'MVF7', displayName: 'MVF7', vehicleType: 'High Speed' }];
const riders = [{ name: 'Developer Test Rider', mobile: '9000000001', vehicle: 'MVTEST001', track: 'MVTEST001', model: 'M7', hub: 'Hub 1' }, { name: 'Rahul Das', mobile: '9876543210', vehicle: 'MVTEST002', track: 'MVTEST002', model: 'URBN', hub: 'Hub 2' }, { name: 'Rahul Das', mobile: '9123456780', vehicle: 'MVTEST003', track: 'MVTEST003', model: 'HUM', hub: 'Hub 1' }];
const DEVELOPMENT_USERS = [
  { name: 'Coordinator', email: 'coordinator@msplassist.local', mobile: 'coordinator@msplassist.local', password: 'coordinator@1234', role: 'COORDINATOR' },
  { name: 'Technician', email: 'technician@msplassist.local', mobile: 'technician@msplassist.local', password: 'technician@1234', role: 'TECHNICIAN' },
];
const bcryptSaltRounds = Number(process.env.AUTH_BCRYPT_SALT_ROUNDS || 12);

function assertDevelopmentSeedAllowed() {
  const isDevelopmentOrTest = ['development', 'test'].includes(process.env.NODE_ENV);
  const isTraining = process.env.MSPL_RUNTIME_ENV === 'training';
  if ((!isDevelopmentOrTest && !isTraining) || process.env.DEVELOPMENT_TEST_SEED !== 'true') {
    throw new Error('Development seed blocked. Set NODE_ENV=development/test or MSPL_RUNTIME_ENV=training, and DEVELOPMENT_TEST_SEED=true.');
  }
}

async function upsertDevelopmentUsers(client = prisma) {
  const results = [];

  for (const user of DEVELOPMENT_USERS) {
    const existing = await client.user.findUnique({ where: { email: user.email }, select: { id: true } });
    if (existing) {
      results.push({ email: user.email, result: 'already-exists' });
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, bcryptSaltRounds);
    await client.user.create({
      data: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        passwordHash,
        role: user.role,
        active: true,
      },
    });
    results.push({ email: user.email, result: 'created' });
  }

  return results;
}

async function run() {
  await prisma.$transaction(async (tx) => {
    for (const hub of hubs) await tx.hub.upsert({ where: { name: hub.name }, update: { active: true }, create: { ...hub, active: true } });
    for (const model of models) await tx.vehicleModel.upsert({ where: { modelCode: model.modelCode }, update: { displayName: model.displayName, active: true, vehicleType: model.vehicleType }, create: { ...model, manufacturer: 'MSPL Development Fleet', active: true } });
    for (const rider of riders) {
      const customer = await tx.customer.findFirst({ where: { registeredMobile: rider.mobile } });
      const saved = customer ? await tx.customer.update({ where: { id: customer.id }, data: { name: rider.name, status: 'ACTIVE' } }) : await tx.customer.create({ data: { name: rider.name, registeredMobile: rider.mobile, status: 'ACTIVE' } });
      const hub = await tx.hub.findUniqueOrThrow({ where: { name: rider.hub } }); const model = await tx.vehicleModel.findUniqueOrThrow({ where: { modelCode: rider.model } });
      const deployment = await tx.deployment.findFirst({ where: { customerId: saved.id, mvTrackNumber: rider.track } });
      if (deployment) await tx.deployment.update({ where: { id: deployment.id }, data: { rentalStatus: 'ACTIVE', hubId: hub.id, vehicleModelId: model.id, vehicleNumber: rider.vehicle } });
      else await tx.deployment.create({ data: { customerId: saved.id, mvTrackNumber: rider.track, vehicleNumber: rider.vehicle, vehicleModelId: model.id, hubId: hub.id, rentalStatus: 'ACTIVE' } });
    }
  });
  const userResults = await upsertDevelopmentUsers();
  for (const userResult of userResults) {
    console.log(`Development user ${userResult.email}: ${userResult.result}.`);
  }
  console.log('Development test dataset ready: 2 hubs, 4 models, 3 active riders/deployments.');
}

if (require.main === module) {
  assertDevelopmentSeedAllowed();
  run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}

module.exports = { DEVELOPMENT_USERS, assertDevelopmentSeedAllowed, upsertDevelopmentUsers };
