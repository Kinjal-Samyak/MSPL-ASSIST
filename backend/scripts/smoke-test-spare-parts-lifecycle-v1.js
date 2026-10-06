/**
 * End-to-end smoke test for the spare-parts requisition / job card lifecycle fixes:
 * 1. Service TL can approve a spare-part request while the job card is Waiting for Parts
 *    (the actual "permission issue" - confirms the backend never blocked this).
 * 2. The Technician's spare-part request stamps the Parts Requisition number (not only the
 *    old Service TL direct-list save, which has since been removed entirely).
 * 3. The requisition closes (partsRequisitionClosedAt) the moment the job card reaches RFD.
 * 4. Returning an RFD ticket to the workshop resets the job card's current-state fields
 *    (diagnostic notes, confirmed spare parts, requisition) on the same row, while spare-part
 *    request history survives.
 * 5. Mark Complete is rejected until Start Repair has been clicked, and Start Repair now
 *    allows an Admin bypass (matching every other job-card action in this app).
 * 6. The direct-list spare-parts endpoint no longer exists (removed - Technician request +
 *    Service TL approval is now the only mechanism).
 * 7. Mark Complete auto-captures completedByName/actualCompletionAt server-side - a client-
 *    submitted name/date is ignored in favor of the assigned Technician's real name and "now."
 *
 * Generates access tokens directly against real seeded Training users (no password guessing).
 * Creates one temporary ticket and deletes every record it creates in cleanup.
 *
 * Run after `npm run build`:  node -r dotenv/config scripts/smoke-test-spare-parts-lifecycle-v1.js dotenv_config_path=.env.training
 */
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../dist/app').default;
const { config } = require('../dist/config');
const prisma = new PrismaClient();

const checks = {};
const pass = (name, value = true) => { checks[name] = value === true ? 'PASS' : `FAIL: ${JSON.stringify(value)}`; return value === true; };

function tokenFor(user) {
  const payload = { sub: user.id, role: user.role, email: user.email, type: 'access' };
  return `Bearer ${jwt.sign(payload, config.auth.jwtAccessSecret, { expiresIn: config.auth.accessTokenTtlSeconds })}`;
}

async function cleanupTicket(ticketId) {
  if (!ticketId) return true;
  const jobCard = await prisma.jobCard.findUnique({ where: { ticketId } });
  await prisma.$transaction(async (tx) => {
    await tx.ticketPriorityChange.deleteMany({ where: { ticketId } });
    await tx.ticketClosureRequest.deleteMany({ where: { ticketId } });
    await tx.ticketActivity.deleteMany({ where: { ticketId } });
    await tx.ticketHistory.deleteMany({ where: { ticketId } });
    await tx.ticketAttachment.deleteMany({ where: { ticketId } });
    await tx.ticketIssueItem.deleteMany({ where: { ticketId } });
    await tx.ticketComment.deleteMany({ where: { ticketId } });
    await tx.notificationLog.deleteMany({ where: { ticketId } });
    if (jobCard) await tx.jobCard.delete({ where: { id: jobCard.id } });
    await tx.ticket.delete({ where: { id: ticketId } });
  });
  return !(await prisma.ticket.findUnique({ where: { id: ticketId } }));
}

async function run() {
  let ticketId;
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true } });
    const coordinator = await prisma.user.findUnique({ where: { email: 'coordinator@msplassist.local' } });
    const serviceTl = await prisma.user.findUnique({ where: { email: 'serviceleader1@msplassist.local' } });
    const technician = await prisma.user.findUnique({ where: { email: 'technician@msplassist.local' } });
    pass('Fixture users found', Boolean(admin && coordinator && serviceTl && technician));

    const adminAuth = tokenFor(admin);
    const coordinatorAuth = tokenFor(coordinator);
    const serviceTlAuth = tokenFor(serviceTl);
    const technicianAuth = tokenFor(technician);

    const rider = await prisma.deployment.findFirst({ where: { rentalStatus: 'ACTIVE' }, include: { customer: true } });
    const category = await prisma.issueCategory.findFirst({ where: { active: true } });
    const part = await prisma.part.findFirst({ where: { availableQuantity: { gte: 5 } } });
    if (!rider || !category || !part) throw new Error('Missing a required fixture (active deployment, issue category, or a part with stock).');
    const partStockBefore = part.availableQuantity;

    // 1. Create ticket -> assign Service TL -> require workshop (assigns Technician)
    const creation = await request(app).post('/api/v1/tickets/conversation').set('Authorization', coordinatorAuth).send({
      registeredMobile: rider.customer.registeredMobile,
      mvTrackNumber: rider.mvTrackNumber,
      vehicleNumber: rider.vehicleNumber,
      rideabilityStatus: 'NOT_MOVABLE',
      issueGroups: [{ issueCategoryId: category.id, issueSubcategory: 'Smoke spare-parts lifecycle', description: 'Smoke test' }],
      remarks: 'Spare parts lifecycle smoke test',
      photoReferences: [],
      conversationMetadata: { smokeTestSparePartsLifecycleV1: true },
    });
    ticketId = creation.body?.data?.ticketId;
    pass('Ticket creation', creation.status === 201 && Boolean(ticketId));

    await request(app).post(`/api/v1/tickets/${ticketId}/assign-service-tl`).set('Authorization', coordinatorAuth).send({ serviceTlId: serviceTl.id });
    const workshop = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/require-workshop`).set('Authorization', serviceTlAuth).send({ technicianId: technician.id });
    pass('Require Workshop assigns Technician', workshop.status === 200 && workshop.body?.data?.newStage === 'IN_PROGRESS');

    // Give the first cycle some diagnostic content, so Fix 4's reset has something real to clear.
    const jcSave = await request(app).patch(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', serviceTlAuth).send({
      initialObservation: 'Cycle 1 observation', rootCause: 'Cycle 1 root cause',
    });
    pass('Service TL saves cycle 1 diagnostic fields', jcSave.status === 200 && jcSave.body?.data?.rootCause === 'Cycle 1 root cause');

    // The old direct-list spare-parts save no longer exists at all - request/approval is the only path now.
    const directListAttempt = await request(app).put(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts`).set('Authorization', serviceTlAuth).send({ items: [] });
    pass('Direct-list spare-parts endpoint no longer exists (404)', directListAttempt.status === 404);

    // 2. Technician submits a spare part request -> Fix 2: requisition number is stamped now
    const requestResult = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`)
      .set('Authorization', technicianAuth)
      .send({ items: [{ partId: part.id, requestedQuantity: 2 }] });
    pass('Technician submits spare part request', requestResult.status === 201 && requestResult.body?.data?.length === 1);
    const requestId = requestResult.body?.data?.[0]?.id;

    const jcAfterRequest = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    pass('Fix 2: requisition number stamped by the request itself', Boolean(jcAfterRequest.body?.data?.partsRequisitionNumber));

    // 3. Technician marks the job Waiting for Parts (exactly when the reported bug occurred)
    const waiting = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/waiting-for-parts`).set('Authorization', technicianAuth).send({});
    pass('Technician marks Waiting for Parts', waiting.status === 200 && waiting.body?.data?.newStage === 'WAITING_PARTS');

    // 4. Fix 1's premise: Service TL can approve the request RIGHT NOW, while WAITING_PARTS (the
    //    bug was the frontend hiding the button here, not the backend rejecting the call).
    const approve = await request(app).post(`/api/v1/workshop-workspace/job-card/spare-part-requests/${requestId}/approve`).set('Authorization', serviceTlAuth).send({});
    pass('Fix 1: Service TL can approve while job card is Waiting for Parts', approve.status === 200 && approve.body?.data?.status === 'APPROVED');

    const partAfterApproval = await prisma.part.findUnique({ where: { id: part.id } });
    pass('Approval deducts inventory', partAfterApproval.availableQuantity === partStockBefore - 2);

    // 5. Resume repair -> attempt Mark Complete WITHOUT Start Repair -> Fix 5 rejects it
    const resume = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/resume`).set('Authorization', technicianAuth).send({});
    pass('Technician resumes repair', resume.status === 200 && resume.body?.data?.newStage === 'IN_PROGRESS');

    const markCompleteTooSoon = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/mark-completed`).set('Authorization', technicianAuth).send({});
    pass('Fix 5: Mark Complete rejected before Start Repair', markCompleteTooSoon.status === 400);

    // Admin bypass: Start Repair should work for Admin too, same as every other job-card action.
    const beforeStartRepair = Date.now();
    const startRepair = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/start-repair`).set('Authorization', adminAuth).send({});
    pass('Admin can Start Repair (bypass)', startRepair.status === 200);

    // Auto-capture: a client-submitted completedByName/actualCompletionAt is ignored - the
    // server stamps "now" and looks up the real assigned Technician's name instead.
    const markComplete = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/mark-completed`).set('Authorization', technicianAuth).send({ completedByName: 'Should Be Ignored', actualCompletionAt: '2020-01-01T00:00:00.000Z' });
    pass('Mark Complete succeeds after Start Repair', markComplete.status === 200 && markComplete.body?.data?.newStage === 'COMPLETED');

    const jcAfterMarkComplete = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    pass('Auto-capture: completedByName is the real Technician name, not the client value', jcAfterMarkComplete.body?.data?.completedByName === technician.name);
    const capturedCompletionAt = jcAfterMarkComplete.body?.data?.actualCompletionAt ? new Date(jcAfterMarkComplete.body.data.actualCompletionAt).getTime() : 0;
    pass('Auto-capture: actualCompletionAt is "now," not the client value', capturedCompletionAt >= beforeStartRepair && capturedCompletionAt <= Date.now());

    // 6. Service TL Final Verification -> RFD -> Fix 3: requisition closes
    const rfd = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/ready-for-deployment`).set('Authorization', serviceTlAuth).send({ completedByName: 'Smoke Technician', actualCompletionAt: new Date().toISOString() });
    pass('Service TL Final Verification -> RFD', rfd.status === 200 && rfd.body?.data?.newStage === 'RFD');

    const jcAfterRfd = await request(app).get(`/api/v1/tickets/${ticketId}/job-card`).set('Authorization', coordinatorAuth);
    pass('Fix 3: requisition closed at RFD', Boolean(jcAfterRfd.body?.data?.partsRequisitionClosedAt));

    // 7. Return to Workshop -> Fix 4: same job card row resets its current-state fields
    const returnToWorkshop = await request(app).put(`/api/v1/coordinator/tickets/${ticketId}/return-to-workshop`).set('Authorization', coordinatorAuth).send({ remarks: 'Smoke test rework cycle' });
    pass('Coordinator returns ticket to workshop', returnToWorkshop.status === 200);

    const requireWorkshopAgain = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/require-workshop`).set('Authorization', serviceTlAuth).send({ technicianId: technician.id });
    pass('Require Workshop runs again for cycle 2', requireWorkshopAgain.status === 200 && requireWorkshopAgain.body?.data?.newStage === 'IN_PROGRESS');

    const jcCycle2 = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    const jc2 = jcCycle2.body?.data;
    pass('Fix 4: diagnostic fields reset for cycle 2', jc2?.initialObservation === null && jc2?.rootCause === null);
    pass('Fix 4: requisition reset for cycle 2', jc2?.partsRequisitionNumber === null && jc2?.partsRequisitionClosedAt === null);
    pass('Fix 4: repairStartedAt reset for cycle 2', jc2?.repairStartedAt === null);
    pass('Fix 4: confirmed spare parts list cleared for cycle 2', Array.isArray(jc2?.spareParts) && jc2.spareParts.length === 0);

    const historyAfterReset = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`).set('Authorization', technicianAuth);
    pass('Fix 4: spare-part request history from cycle 1 survives the reset', historyAfterReset.body?.data?.some((r) => r.id === requestId && r.status === 'APPROVED'));
  } catch (error) {
    pass('Smoke test execution', error instanceof Error ? error.stack : String(error));
  } finally {
    try { pass('Ticket cleanup', await cleanupTicket(ticketId)); } catch (error) { pass('Ticket cleanup', error instanceof Error ? error.message : String(error)); }
  }

  console.table(checks);
  const failed = Object.entries(checks).filter(([, value]) => value !== 'PASS');
  console.log(failed.length ? `Smoke test: FAIL (${failed.length} check(s))` : 'Smoke test: PASS');
  if (failed.length) process.exitCode = 1;
}

run().finally(() => prisma.$disconnect());
