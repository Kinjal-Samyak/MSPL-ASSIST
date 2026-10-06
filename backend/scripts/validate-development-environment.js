const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const app = require('../dist/app').default;
const prisma = new PrismaClient();

const checks = {};
const pass = (name, value = true) => { checks[name] = value === true ? 'PASS' : `FAIL: ${value}`; return value === true; };

async function cleanup(ticketId) {
  if (!ticketId) return true;
  await prisma.$transaction(async (tx) => {
    await tx.ticketActivity.deleteMany({ where: { ticketId } });
    await tx.ticketHistory.deleteMany({ where: { ticketId } });
    await tx.ticketAttachment.deleteMany({ where: { ticketId } });
    await tx.ticketIssueItem.deleteMany({ where: { ticketId } });
    await tx.ticketComment.deleteMany({ where: { ticketId } });
    await tx.notificationLog.deleteMany({ where: { ticketId } });
    await tx.ticket.delete({ where: { id: ticketId } });
  });
  return !(await prisma.ticket.findUnique({ where: { id: ticketId } }));
}

async function run() {
  let ticketId;
  try {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'coordinator@msplassist.local',
      password: 'coordinator@1234',
    });
    pass('Coordinator authentication', login.status === 200 && Boolean(login.body?.data?.tokens?.accessToken));
    const authorization = `Bearer ${login.body?.data?.tokens?.accessToken ?? ''}`;
    if (login.status !== 200) throw new Error(JSON.stringify(login.body));
    const rider = await prisma.customer.findFirst({ where: { registeredMobile: '9000000001' }, include: { deployments: { where: { rentalStatus: 'ACTIVE' } } } });
    const categories = await prisma.issueCategory.findMany({ where: { active: true }, take: 2 });
    pass('Development rider and active deployment', Boolean(rider && rider.deployments.length === 1));
    pass('Issue category master', categories.length >= 2);
    if (!rider || !rider.deployments[0] || categories.length < 2) throw new Error('Required development data is unavailable. Run seed:dev first.');
    const deployment = rider.deployments[0];
    const response = await request(app).post('/api/v1/tickets/conversation').set('Authorization', authorization).send({ registeredMobile: rider.registeredMobile, mvTrackNumber: deployment.mvTrackNumber, vehicleNumber: deployment.vehicleNumber, rideabilityStatus: 'NOT_MOVABLE', issueGroups: [{ issueCategoryId: categories[0].id, issueSubcategory: 'Development subcategory A', description: 'Development validation issue A' }, { issueCategoryId: categories[1].id, issueSubcategory: 'Development subcategory B', description: 'Development validation issue B' }], remarks: 'Temporary development validation ticket', photoReferences: [{ fileUrl: 'development://validation-photo-1', fileType: 'image/jpeg' }], conversationMetadata: { validationRun: true, channel: 'DEVELOPMENT_TEST' } });
    pass('Conversation endpoint reachable', response.status === 201);
    ticketId = response.body?.data?.ticketId;
    pass('Conversation ticket created', Boolean(ticketId && response.body?.data?.ticketNumber));
    if (!ticketId) throw new Error(JSON.stringify(response.body));
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { issueItems: true, attachments: true, activities: true } });
    pass('Rideability stored', ticket?.rideabilityStatus === 'NOT_MOVABLE');
    pass('Conversation metadata stored', ticket?.conversationMetadata?.validationRun === true);
    pass('Multiple issue groups persisted', ticket?.issueItems.length === 2);
    pass('Issue subcategories stored', ticket?.issueItems.some(x => x.issueSubcategory === 'Development subcategory B'));
    pass('Photo references stored', ticket?.attachments.some(x => x.fileUrl === 'development://validation-photo-1'));
    pass('Timeline created', ticket?.activities.some(x => x.activityType === 'CONVERSATION_TICKET_CREATED'));
    const detail = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', authorization);
    pass('Ticket retrieved', detail.status === 200);
    const list = await request(app).get('/api/v1/tickets').set('Authorization', authorization).query({ page: 1, pageSize: 100, search: response.body.data.ticketNumber });
    pass('Ticket listed', list.status === 200 && list.body?.data?.items?.some(x => x.id === ticketId));
  } catch (error) { pass('Validation execution', error instanceof Error ? error.message : String(error)); }
  finally { try { pass('Cleanup successful', await cleanup(ticketId)); } catch (error) { pass('Cleanup successful', error instanceof Error ? error.message : String(error)); } }
  console.table(checks); const failed = Object.values(checks).filter(value => value !== 'PASS'); console.log(failed.length ? `Development validation: FAIL (${failed.length} check(s))` : 'Development validation: PASS'); if (failed.length) process.exitCode = 1;
}
run().finally(() => prisma.$disconnect());
