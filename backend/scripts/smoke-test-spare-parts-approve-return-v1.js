/**
 * End-to-end smoke test for the "Approve All / editable quantity / return unused parts to
 * inventory" spare-parts features:
 * 1. Editing the approved quantity at approval time stores it separately as approvedQuantity,
 *    while requestedQuantity (the Technician's original ask) is left untouched, and the edited
 *    amount - not the originally requested one - is what gets deducted from stock.
 * 2. Approve All partially fails when one part in the batch has insufficient stock: that request
 *    is skipped and reported, every other request in the batch still gets approved.
 * 3. The Technician can return part of an approved part's quantity back to live inventory, capped
 *    at (approved qty - already returned).
 * 4. The Service TL's "Return to Inventory from Job Card" fallback stacks against the same cap as
 *    the Technician's return - both entry points share one running total.
 * 5. Returning past the remaining cap is rejected; a Technician who doesn't own the job card, and
 *    a Service TL not assigned to the ticket, are both rejected from returning parts.
 *
 * Generates access tokens directly against real seeded Training users (no password guessing).
 * Creates one temporary ticket and deletes every record it creates in cleanup.
 *
 * Run after `npm run build`:  node -r dotenv/config scripts/smoke-test-spare-parts-approve-return-v1.js dotenv_config_path=.env.training
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
  let extraStockPartId;
  let extraStockOriginalQuantity;
  let extraStockRestored = false;
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true } });
    const coordinator = await prisma.user.findUnique({ where: { email: 'coordinator@msplassist.local' } });
    const serviceTl = await prisma.user.findUnique({ where: { email: 'serviceleader1@msplassist.local' } });
    const otherServiceTl = await prisma.user.findFirst({ where: { role: 'SERVICE_TL', active: true, email: { not: 'serviceleader1@msplassist.local' } } });
    const technician = await prisma.user.findUnique({ where: { email: 'technician@msplassist.local' } });
    const otherTechnician = await prisma.user.findFirst({ where: { role: 'TECHNICIAN', email: { not: 'technician@msplassist.local' } } });
    pass('Fixture users found', Boolean(admin && coordinator && serviceTl && otherServiceTl && technician && otherTechnician));

    const adminAuth = tokenFor(admin);
    const coordinatorAuth = tokenFor(coordinator);
    const serviceTlAuth = tokenFor(serviceTl);
    const otherServiceTlAuth = tokenFor(otherServiceTl);
    const technicianAuth = tokenFor(technician);
    const otherTechnicianAuth = tokenFor(otherTechnician);

    const rider = await prisma.deployment.findFirst({ where: { rentalStatus: 'ACTIVE' }, include: { customer: true } });
    const category = await prisma.issueCategory.findFirst({ where: { active: true } });
    const parts = await prisma.part.findMany({ where: { availableQuantity: { gte: 5 } }, take: 2 });
    if (!rider || !category || parts.length < 2) throw new Error('Missing a required fixture (active deployment, issue category, or two parts with stock).');
    const [partA, partB] = parts;
    const partAStockBefore = partA.availableQuantity;

    // Part B is deliberately starved of stock right before Approve All, so one item in the batch
    // is guaranteed to fail on insufficient stock while the other (part A) still succeeds.
    extraStockPartId = partB.id;
    extraStockOriginalQuantity = partB.availableQuantity;
    await prisma.part.update({ where: { id: partB.id }, data: { availableQuantity: 0 } });

    // 1. Create ticket -> assign Service TL -> require workshop (assigns Technician)
    const creation = await request(app).post('/api/v1/tickets/conversation').set('Authorization', coordinatorAuth).send({
      registeredMobile: rider.customer.registeredMobile,
      mvTrackNumber: rider.mvTrackNumber,
      vehicleNumber: rider.vehicleNumber,
      rideabilityStatus: 'NOT_MOVABLE',
      issueGroups: [{ issueCategoryId: category.id, issueSubcategory: 'Smoke approve-all return', description: 'Smoke test' }],
      remarks: 'Approve-all / return-to-inventory smoke test',
      photoReferences: [],
      conversationMetadata: { smokeTestSparePartsApproveReturnV1: true },
    });
    ticketId = creation.body?.data?.ticketId;
    pass('Ticket creation', creation.status === 201 && Boolean(ticketId));

    await request(app).post(`/api/v1/tickets/${ticketId}/assign-service-tl`).set('Authorization', coordinatorAuth).send({ serviceTlId: serviceTl.id });
    const workshop = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/require-workshop`).set('Authorization', serviceTlAuth).send({ technicianId: technician.id });
    pass('Require Workshop assigns Technician', workshop.status === 200 && workshop.body?.data?.newStage === 'IN_PROGRESS');

    // 2. Technician requests part A (qty 4) and part B (qty 2, but B has 0 stock right now)
    const requestResult = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`)
      .set('Authorization', technicianAuth)
      .send({ items: [{ partId: partA.id, requestedQuantity: 4 }, { partId: partB.id, requestedQuantity: 2 }] });
    pass('Technician submits two spare part requests', requestResult.status === 201 && requestResult.body?.data?.length === 2);
    const requestForA = requestResult.body.data.find((r) => r.partId === partA.id);
    const requestForB = requestResult.body.data.find((r) => r.partId === partB.id);

    // 3. Service TL edits part A's approved quantity down to 3 and approves it individually.
    const approveEdited = await request(app)
      .post(`/api/v1/workshop-workspace/job-card/spare-part-requests/${requestForA.id}/approve`)
      .set('Authorization', serviceTlAuth)
      .send({ approvedQuantity: 3 });
    pass('Edited approval succeeds', approveEdited.status === 200 && approveEdited.body?.data?.status === 'APPROVED');
    pass('requestedQuantity stays as the original ask', approveEdited.body?.data?.requestedQuantity === 4);
    pass('approvedQuantity reflects the edited amount', approveEdited.body?.data?.approvedQuantity === 3);

    const partAAfterEdit = await prisma.part.findUnique({ where: { id: partA.id } });
    pass('Stock deducted by the edited amount, not the originally requested one', partAAfterEdit.availableQuantity === partAStockBefore - 3);

    // 4. Technician submits one more request for part A, then Approve All is called covering both
    //    the new part-A request and the still-pending, now-impossible part-B request.
    const secondRequest = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`)
      .set('Authorization', technicianAuth)
      .send({ items: [{ partId: partA.id, requestedQuantity: 1 }] });
    pass('Technician submits a second part-A request', secondRequest.status === 201);

    const approveAll = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests/approve-all`)
      .set('Authorization', serviceTlAuth)
      .send({});
    pass('Approve All succeeds overall', approveAll.status === 200);
    pass('Approve All approved the part-A request', approveAll.body?.data?.approved?.length === 1);
    pass('Approve All skipped and reported the out-of-stock part-B request', approveAll.body?.data?.failed?.some((f) => f.requestId === requestForB.id));

    const requestBAfterApproveAll = await request(app)
      .get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`)
      .set('Authorization', serviceTlAuth);
    const bRow = requestBAfterApproveAll.body?.data?.find((r) => r.id === requestForB.id);
    pass('The skipped part-B request is still PENDING, not silently dropped', bRow?.status === 'PENDING');

    // Restock part B and approve it too, so the return-to-inventory step below has something on
    // both parts to work with.
    await prisma.part.update({ where: { id: partB.id }, data: { availableQuantity: extraStockOriginalQuantity } });
    extraStockRestored = true;
    const approveB = await request(app).post(`/api/v1/workshop-workspace/job-card/spare-part-requests/${requestForB.id}/approve`).set('Authorization', serviceTlAuth).send({});
    pass('Part B approves once restocked', approveB.status === 200 && approveB.body?.data?.status === 'APPROVED');

    // Job card now has: part A required = 3 + 1 = 4, part B required = 2.
    const jcBeforeReturn = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    const partARow = jcBeforeReturn.body?.data?.spareParts?.find((p) => p.partId === partA.id);
    pass('Confirmed part A quantity is 4 (3 + 1 across both approvals)', partARow?.requiredQuantity === 4);
    pass('Part A is fully returnable before any return happens', partARow?.remainingReturnable === 4);

    const partAAfterApproveAll = await prisma.part.findUnique({ where: { id: partA.id } });
    pass('Approve All deducted the second part-A unit from live stock', partAAfterApproveAll.availableQuantity === partAAfterEdit.availableQuantity - 1);

    // 5. Technician returns 1 of part A. Then Service TL returns 2 more via the fallback entry
    //    point - both share the same running cap (requiredQuantity - returnedQuantity = 4).
    const otherTechnicianReturnAttempt = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`)
      .set('Authorization', otherTechnicianAuth)
      .send({ items: [{ partId: partA.id, returnQuantity: 1 }] });
    pass('A Technician who does not own this job card is rejected from returning parts', otherTechnicianReturnAttempt.status === 403);

    const technicianReturn = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`)
      .set('Authorization', technicianAuth)
      .send({ items: [{ partId: partA.id, returnQuantity: 1 }] });
    pass('Technician returns 1 unit of part A', technicianReturn.status === 200 && technicianReturn.body?.data?.items?.[0]?.returnQuantity === 1);

    const partAAfterFirstReturn = await prisma.part.findUnique({ where: { id: partA.id } });
    pass('Live inventory increases by the returned amount', partAAfterFirstReturn.availableQuantity === partAAfterApproveAll.availableQuantity + 1);

    const otherServiceTlReturnAttempt = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`)
      .set('Authorization', otherServiceTlAuth)
      .send({ items: [{ partId: partA.id, returnQuantity: 1 }] });
    pass('A Service TL not assigned to this ticket is rejected from returning parts', otherServiceTlReturnAttempt.status === 403);

    const serviceTlReturn = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`)
      .set('Authorization', serviceTlAuth)
      .send({ items: [{ partId: partA.id, returnQuantity: 2 }] });
    pass('Service TL fallback returns 2 more units of part A, stacking on the Technician\'s return', serviceTlReturn.status === 200);

    const jcAfterBothReturns = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    const partARowAfter = jcAfterBothReturns.body?.data?.spareParts?.find((p) => p.partId === partA.id);
    pass('Returned quantity accumulates across both entry points (1 + 2 = 3)', partARowAfter?.returnedQuantity === 3);
    pass('Remaining returnable is now exactly the cap minus what has been returned (4 - 3 = 1)', partARowAfter?.remainingReturnable === 1);

    // 6. Attempting to return more than what remains (only 1 left) is rejected.
    const overReturn = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`)
      .set('Authorization', technicianAuth)
      .send({ items: [{ partId: partA.id, returnQuantity: 5 }] });
    pass('Returning past the remaining cap is rejected', overReturn.status === 400);

    // Admin can also return, exercising the third allowed role.
    const adminReturn = await request(app)
      .post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`)
      .set('Authorization', adminAuth)
      .send({ items: [{ partId: partA.id, returnQuantity: 1 }] });
    pass('Admin can return the final remaining unit of part A', adminReturn.status === 200);

    const jcFinal = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    const partARowFinal = jcFinal.body?.data?.spareParts?.find((p) => p.partId === partA.id);
    pass('Part A is fully returned - nothing remains returnable', partARowFinal?.remainingReturnable === 0);
  } catch (error) {
    pass('Smoke test execution', error instanceof Error ? error.stack : String(error));
  } finally {
    try {
      // Only restore if the run failed before reaching the deliberate restock step above - once
      // restocked, any further change to this part's stock is real test activity (approvals,
      // returns), not something to undo.
      if (extraStockPartId && extraStockOriginalQuantity != null && !extraStockRestored) {
        await prisma.part.update({ where: { id: extraStockPartId }, data: { availableQuantity: extraStockOriginalQuantity } });
      }
    } catch {
      // Non-fatal - cleanup below still removes the ticket.
    }
    try { pass('Ticket cleanup', await cleanupTicket(ticketId)); } catch (error) { pass('Ticket cleanup', error instanceof Error ? error.message : String(error)); }
  }

  console.table(checks);
  const failed = Object.entries(checks).filter(([, value]) => value !== 'PASS');
  console.log(failed.length ? `Smoke test: FAIL (${failed.length} check(s))` : 'Smoke test: PASS');
  if (failed.length) process.exitCode = 1;
}

run().finally(() => prisma.$disconnect());
