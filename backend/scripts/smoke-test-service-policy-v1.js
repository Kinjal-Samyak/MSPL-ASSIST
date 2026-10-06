/**
 * End-to-end smoke test for Slice 1 of the TAT & SLA Framework (Service Policy module):
 * Service Policy config CRUD, corrected per-stage TAT capture (Ticket Response,
 * Technician Assignment, Repair via Start Repair), priority lock rules, and the new
 * Ticket list/detail SLA fields (currentStage, owner, slaStatus, workshopSla, stageProgress).
 *
 * Generates access tokens directly (same TokenPayload shape as AuthService.issueTokens)
 * against real, already-seeded Training users - no password guessing, no login calls.
 *
 * Creates a single temporary ticket fixture and deletes every record it creates
 * (including TicketPriorityChange rows, which RESTRICT ticket deletion) in cleanup.
 *
 * Run after `npm run build`:  node scripts/smoke-test-service-policy-v1.js
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
    await tx.ticketActivity.deleteMany({ where: { ticketId } });
    await tx.ticketHistory.deleteMany({ where: { ticketId } });
    await tx.ticketAttachment.deleteMany({ where: { ticketId } });
    await tx.ticketIssueItem.deleteMany({ where: { ticketId } });
    await tx.ticketComment.deleteMany({ where: { ticketId } });
    await tx.notificationLog.deleteMany({ where: { ticketId } });
    if (jobCard) {
      await tx.jobCardSparePartRequest.deleteMany({ where: { jobCardId: jobCard.id } });
      await tx.jobCard.delete({ where: { id: jobCard.id } });
    }
    await tx.ticket.delete({ where: { id: ticketId } });
  });
  return !(await prisma.ticket.findUnique({ where: { id: ticketId } }));
}

async function run() {
  let ticketId;
  let originalThresholdPct;
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

    // 1. Service Policy config reads (seeded data)
    const priorities = await request(app).get('/api/v1/service-policy/priorities').set('Authorization', coordinatorAuth);
    pass('List Priorities (seeded 4)', priorities.status === 200 && priorities.body?.data?.length === 4);

    const workshopSla = await request(app).get('/api/v1/service-policy/workshop-sla').set('Authorization', coordinatorAuth);
    pass('List Workshop SLA targets (seeded 4)', workshopSla.status === 200 && workshopSla.body?.data?.length === 4);

    const stageSla = await request(app).get('/api/v1/service-policy/stage-sla').set('Authorization', technicianAuth);
    pass('List Stage SLA targets (seeded 28)', stageSla.status === 200 && stageSla.body?.data?.length === 28);

    const slaStatusRuleBefore = await request(app).get('/api/v1/service-policy/sla-status-rule').set('Authorization', serviceTlAuth);
    pass('Get SLA Status Rule (seeded 20%)', slaStatusRuleBefore.status === 200 && slaStatusRuleBefore.body?.data?.atRiskThresholdPct === 20);
    originalThresholdPct = slaStatusRuleBefore.body?.data?.atRiskThresholdPct;

    const versionsBefore = await request(app).get('/api/v1/service-policy/versions').set('Authorization', coordinatorAuth);
    const versionCountBefore = versionsBefore.body?.data?.length ?? 0;
    pass('List Configuration Versions (seeded v1.0)', versionsBefore.status === 200 && versionCountBefore >= 1);

    // 2. Non-admin write is forbidden; Admin write bumps a new Configuration Version
    const coordinatorWriteAttempt = await request(app).patch('/api/v1/service-policy/sla-status-rule').set('Authorization', coordinatorAuth).send({ atRiskThresholdPct: 25 });
    pass('Non-admin cannot write Service Policy config', coordinatorWriteAttempt.status === 403);

    const adminWrite = await request(app).patch('/api/v1/service-policy/sla-status-rule').set('Authorization', adminAuth).send({ atRiskThresholdPct: 25 });
    pass('Admin can update SLA Status Rule', adminWrite.status === 200 && adminWrite.body?.data?.atRiskThresholdPct === 25);

    const versionsAfterWrite = await request(app).get('/api/v1/service-policy/versions').set('Authorization', coordinatorAuth);
    pass('Configuration Version bumped after config write', (versionsAfterWrite.body?.data?.length ?? 0) === versionCountBefore + 1);

    // revert the threshold back to its original value so Training config isn't left mutated
    await request(app).patch('/api/v1/service-policy/sla-status-rule').set('Authorization', adminAuth).send({ atRiskThresholdPct: originalThresholdPct });
    originalThresholdPct = undefined;

    // 3. Ticket lifecycle with TAT/SLA + priority lock verification
    const rider = await prisma.deployment.findFirst({ where: { rentalStatus: 'ACTIVE' }, include: { customer: true } });
    const category = await prisma.issueCategory.findFirst({ where: { active: true } });
    if (!rider || !category) throw new Error('No active deployment or issue category found in the target database.');

    const creation = await request(app).post('/api/v1/tickets/conversation').set('Authorization', coordinatorAuth).send({
      registeredMobile: rider.customer.registeredMobile,
      mvTrackNumber: rider.mvTrackNumber,
      vehicleNumber: rider.vehicleNumber,
      rideabilityStatus: 'NOT_MOVABLE',
      issueGroups: [{ issueCategoryId: category.id, issueSubcategory: 'Smoke SLA v1', description: 'Smoke SLA v1 issue' }],
      remarks: 'Service Policy / TAT-SLA smoke test',
      photoReferences: [],
      conversationMetadata: { smokeTestServicePolicyV1: true },
    });
    ticketId = creation.body?.data?.ticketId;
    pass('Ticket creation', creation.status === 201 && Boolean(ticketId));

    // 3a. Ticket list carries currentStage / owner / slaStatus
    const listAfterCreate = await request(app).get('/api/v1/tickets').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 100 });
    const listItem = listAfterCreate.body?.data?.items?.find((item) => item.id === ticketId);
    pass('Ticket list item has currentStage/owner/slaStatus', Boolean(listItem?.currentStage?.key && listItem?.owner?.role && listItem?.slaStatus?.status));
    pass('New ticket currentStage is Ticket Response (parallel start)', listItem?.currentStage?.key === 'TICKET_RESPONSE' || listItem?.currentStage?.key === 'TECHNICIAN_ASSIGNMENT');

    // 3b. Ticket detail stamps openedAt (write-once) on first Coordinator view, exposes workshopSla + 7 stageProgress rows
    const detailFirstView = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', coordinatorAuth);
    pass('Ticket detail exposes workshopSla', detailFirstView.status === 200 && Boolean(detailFirstView.body?.data?.workshopSla?.status));
    pass('Ticket detail exposes 7 stageProgress rows', detailFirstView.body?.data?.stageProgress?.length === 7);
    const ticketAfterFirstView = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { openedAt: true } });
    pass('openedAt stamped on first Coordinator view', Boolean(ticketAfterFirstView.openedAt));
    const firstOpenedAt = ticketAfterFirstView.openedAt?.toISOString();

    await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', coordinatorAuth);
    const ticketAfterSecondView = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { openedAt: true } });
    pass('openedAt is write-once (unchanged on second view)', ticketAfterSecondView.openedAt?.toISOString() === firstOpenedAt);

    const ticketResponseStage = detailFirstView.body?.data?.stageProgress?.find((s) => s.key === 'TICKET_RESPONSE');
    pass('Ticket Response stage completed after openedAt stamp', ticketResponseStage?.status === 'COMPLETED');

    // 4. Priority lock: Coordinator may change priority before Service TL assignment
    const priorityChangeByCoordinator = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/priority`)
      .set('Authorization', coordinatorAuth)
      .send({ priority: 'HIGH', reason: 'Smoke test: escalating before Service TL assignment.' });
    pass('Coordinator can change priority before Service TL assignment', priorityChangeByCoordinator.status === 200 && priorityChangeByCoordinator.body?.data?.priority === 'HIGH');

    const priorityHistoryAfterFirstChange = await request(app).get(`/api/v1/tickets/${ticketId}/priority-history`).set('Authorization', technicianAuth);
    pass('Priority history records the change with reason/actor', priorityHistoryAfterFirstChange.body?.data?.length === 1 && priorityHistoryAfterFirstChange.body.data[0].reason.includes('escalating'));

    // 5. Assign Service TL -> Coordinator is now locked out of priority changes
    const assign = await request(app).post(`/api/v1/tickets/${ticketId}/assign-service-tl`).set('Authorization', coordinatorAuth).send({ serviceTlId: serviceTl.id });
    pass('Assign Service TL', assign.status === 200 && assign.body?.data?.newStage === 'SERVICE_TL_REVIEW');

    const coordinatorLockedAttempt = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/priority`)
      .set('Authorization', coordinatorAuth)
      .send({ priority: 'CRITICAL', reason: 'Should be rejected.' });
    pass('Coordinator locked out of priority change after Service TL assigned', coordinatorLockedAttempt.status === 403);

    // 5a. Service TL may change priority before Technician assignment
    const priorityChangeByServiceTl = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/priority`)
      .set('Authorization', serviceTlAuth)
      .send({ priority: 'CRITICAL', reason: 'Smoke test: Service TL escalation before technician assignment.' });
    pass('Service TL can change priority before Technician assignment', priorityChangeByServiceTl.status === 200 && priorityChangeByServiceTl.body?.data?.priority === 'CRITICAL');

    // 6. Require Workshop (assign Technician) -> Technician Assignment stage completes; priority now permanently locked
    const workshop = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/require-workshop`).set('Authorization', serviceTlAuth).send({ technicianId: technician.id });
    pass('Require Workshop assigns Technician and creates Job Card', workshop.status === 200 && workshop.body?.data?.newStage === 'IN_PROGRESS');

    // Coordinator/Admin-only detail endpoint (Service TL and Technician have their own scoped read paths,
    // neither of which currently exposes stageProgress/workshopSla - out of scope for this slice).
    const detailAfterTechAssignment = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', coordinatorAuth);
    const technicianAssignmentStage = detailAfterTechAssignment.body?.data?.stageProgress?.find((s) => s.key === 'TECHNICIAN_ASSIGNMENT');
    pass('Technician Assignment stage completed after Technician assigned', technicianAssignmentStage?.status === 'COMPLETED');

    const serviceTlLockedAttempt = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/priority`)
      .set('Authorization', serviceTlAuth)
      .send({ priority: 'LOW', reason: 'Should be rejected - technician already assigned.' });
    pass('Priority permanently locked once Technician assigned', serviceTlLockedAttempt.status === 403);

    const adminPriorityBypassAttempt = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/priority`)
      .set('Authorization', adminAuth)
      .send({ priority: 'LOW', reason: 'Admin should not have an override per the frozen spec.' });
    pass('Admin has no priority-lock override (matches frozen spec)', adminPriorityBypassAttempt.status === 403);

    // 7. Start Repair (new Technician action) stamps repairStartedAt and advances the Repair stage
    const jobCardBeforeRepair = await prisma.jobCard.findUnique({ where: { ticketId }, select: { repairStartedAt: true } });
    pass('repairStartedAt is null before Start Repair', jobCardBeforeRepair.repairStartedAt === null);

    const wrongTechnicianStartRepair = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/start-repair`).set('Authorization', coordinatorAuth).send({});
    pass('Coordinator cannot Start Repair', wrongTechnicianStartRepair.status === 403);

    const startRepair = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/start-repair`).set('Authorization', technicianAuth).send({});
    pass('Technician Start Repair succeeds', startRepair.status === 200);

    const jobCardAfterRepair = await prisma.jobCard.findUnique({ where: { ticketId }, select: { repairStartedAt: true } });
    pass('repairStartedAt stamped after Start Repair', Boolean(jobCardAfterRepair.repairStartedAt));

    const startRepairAgain = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/start-repair`).set('Authorization', technicianAuth).send({});
    pass('Start Repair rejects a second call (already started)', startRepairAgain.status === 409);

    const detailAfterRepairStart = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', coordinatorAuth);
    const repairStage = detailAfterRepairStart.body?.data?.stageProgress?.find((s) => s.key === 'REPAIR');
    pass('Repair stage is IN_PROGRESS after Start Repair', repairStage?.status === 'IN_PROGRESS');

    // 8. Existing untouched workflow still functions: Job Card Detail includes new repairStartedAt field but keeps existing shape
    const jobCardDetail = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth);
    pass('Job Card detail endpoint still returns editable/effectiveStatus (untouched fields)', jobCardDetail.status === 200 && typeof jobCardDetail.body?.data?.editable === 'boolean' && Boolean(jobCardDetail.body?.data?.effectiveStatus));
    pass('Job Card detail now also exposes repairStartedAt', Boolean(jobCardDetail.body?.data?.repairStartedAt));

    // 9. Regression: rest of the pre-existing (untouched) job card lifecycle still works end-to-end
    const jcSave = await request(app).patch(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', serviceTlAuth).send({
      initialObservation: 'Smoke SLA v1 observation',
      rootCause: 'Smoke SLA v1 root cause',
      estimatedCompletionAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    pass('Service TL can still save Job Card diagnostic fields', jcSave.status === 200 && jcSave.body?.data?.rootCause === 'Smoke SLA v1 root cause');

    const markCompleted = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/mark-completed`).set('Authorization', technicianAuth).send({ completedByName: 'Smoke Technician', actualCompletionAt: new Date().toISOString() });
    pass('Technician Mark Complete still works', markCompleted.status === 200 && markCompleted.body?.data?.newStage === 'COMPLETED');

    const finalVerification = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/ready-for-deployment`).set('Authorization', serviceTlAuth).send({ completedByName: 'Smoke Technician', actualCompletionAt: new Date().toISOString() });
    pass('Service TL Final Verification -> RFD still works', finalVerification.status === 200 && finalVerification.body?.data?.newStage === 'RFD');

    const closure = await request(app).post(`/api/v1/tickets/${ticketId}/close-decision`).set('Authorization', coordinatorAuth).send({ decision: 'YES' });
    pass('Coordinator can still close the ticket', closure.status === 200 && closure.body?.data?.closed === true);

    const detailAfterClose = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', coordinatorAuth);
    const workshopSlaAfterClose = detailAfterClose.body?.data?.workshopSla;
    pass('Workshop SLA completes (COMPLETED/COMPLETED_LATE) once ticket is closed', workshopSlaAfterClose?.status === 'COMPLETED' || workshopSlaAfterClose?.status === 'COMPLETED_LATE');
    pass('Ticket detail closedAt persisted', Boolean(detailAfterClose.body?.data?.ticketSummary?.closedAt));
  } catch (error) {
    pass('Smoke test execution', error instanceof Error ? error.stack : String(error));
  } finally {
    if (originalThresholdPct !== undefined) {
      try {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true } });
        await request(app).patch('/api/v1/service-policy/sla-status-rule').set('Authorization', tokenFor(admin)).send({ atRiskThresholdPct: originalThresholdPct });
      } catch (error) { /* best-effort revert */ }
    }
    try { pass('Ticket cleanup', await cleanupTicket(ticketId)); } catch (error) { pass('Ticket cleanup', error instanceof Error ? error.message : String(error)); }
  }

  console.table(checks);
  const failed = Object.entries(checks).filter(([, value]) => value !== 'PASS');
  console.log(failed.length ? `Smoke test: FAIL (${failed.length} check(s))` : 'Smoke test: PASS');
  if (failed.length) process.exitCode = 1;
}

run().finally(() => prisma.$disconnect());
