/**
 * End-to-end smoke test for the corrected workflow lifecycle:
 * Coordinator -> Service TL -> Technician -> Service TL -> Coordinator -> Closed.
 *
 * Verifies (against a real database, via the built app): Coordinator can see and act on
 * a CREATED ticket, ticket disappears from the Workbench once a Service TL is assigned,
 * Service TL sees Workshop Required + completes the auto-created Job Card (Initial
 * Observation/Root Cause/Other Requirements/ETA/Spare Parts), Job Card appears in the
 * Technician Console, Technician can only touch approved fields and Mark Complete,
 * Job Card returns to Service TL for Final Verification, RFD returns the ticket to the
 * Coordinator Workbench, and Coordinator can Close the ticket.
 *
 * Creates temporary fixtures (Service TL user, Part Category/Part) if missing and
 * deletes every record it creates in the cleanup phase.
 *
 * Run after `npm run build`:  node scripts/smoke-test-workflow-v2.js
 */
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../dist/app').default;
const prisma = new PrismaClient();

const checks = {};
const pass = (name, value = true) => { checks[name] = value === true ? 'PASS' : `FAIL: ${value}`; return value === true; };

const SMOKE_SERVICE_TL_EMAIL = 'smoke.servicetl.v2@msplassist.local';
const SMOKE_PART_CATEGORY = 'Smoke Test Category V2';
const SMOKE_PART_CODE = 'SMOKE-TEST-V2-001';

async function ensureFixtures() {
  let serviceTl = await prisma.user.findUnique({ where: { email: SMOKE_SERVICE_TL_EMAIL } });
  let createdServiceTl = false;
  if (!serviceTl) {
    const passwordHash = await bcrypt.hash('SmokeTest@1234', 12);
    serviceTl = await prisma.user.create({
      data: { name: 'Smoke Test Service TL V2', email: SMOKE_SERVICE_TL_EMAIL, mobile: '9000000098', role: 'SERVICE_TL', passwordHash, active: true },
    });
    createdServiceTl = true;
  }

  let category = await prisma.partCategory.findUnique({ where: { name: SMOKE_PART_CATEGORY } });
  let createdCategory = false;
  if (!category) {
    category = await prisma.partCategory.create({ data: { name: SMOKE_PART_CATEGORY, displayOrder: 999 } });
    createdCategory = true;
  }

  let part = await prisma.part.findUnique({ where: { partCode: SMOKE_PART_CODE } });
  let createdPart = false;
  if (!part) {
    part = await prisma.part.create({
      data: { partCode: SMOKE_PART_CODE, partName: 'Smoke Test V2 Brake Pad', categoryId: category.id, unitOfMeasure: 'PIECE', partCost: 100, availableQuantity: 5 },
    });
    createdPart = true;
  }

  return { serviceTl, createdServiceTl, category, createdCategory, part, createdPart };
}

async function cleanupTicket(ticketId) {
  if (!ticketId) return true;
  const jobCard = await prisma.jobCard.findUnique({ where: { ticketId } });
  await prisma.$transaction(async (tx) => {
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

async function cleanupFixtures(fixtures) {
  if (fixtures.createdPart) await prisma.part.delete({ where: { id: fixtures.part.id } });
  if (fixtures.createdCategory) await prisma.partCategory.delete({ where: { id: fixtures.category.id } });
  if (fixtures.createdServiceTl) await prisma.user.delete({ where: { id: fixtures.serviceTl.id } });
}

async function login(email, password) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { status: response.status, token: response.body?.data?.tokens?.accessToken, body: response.body };
}

async function run() {
  let ticketId;
  let fixtures;
  try {
    fixtures = await ensureFixtures();
    pass('Smoke fixtures ready', Boolean(fixtures.serviceTl && fixtures.part));

    const coordinatorLogin = await login('coordinator@msplassist.local', 'coordinator@1234');
    const coordinatorAuth = `Bearer ${coordinatorLogin.token ?? ''}`;
    pass('Coordinator authentication', coordinatorLogin.status === 200 && Boolean(coordinatorLogin.token));

    const technicianLogin = await login('technician@msplassist.local', 'technician@1234');
    const technicianAuth = `Bearer ${technicianLogin.token ?? ''}`;
    pass('Technician authentication', technicianLogin.status === 200 && Boolean(technicianLogin.token));

    const serviceTlLogin = await login(SMOKE_SERVICE_TL_EMAIL, 'SmokeTest@1234');
    const serviceTlAuth = `Bearer ${serviceTlLogin.token ?? ''}`;
    pass('Service TL authentication', serviceTlLogin.status === 200 && Boolean(serviceTlLogin.token));

    const technician = await prisma.user.findUnique({ where: { email: 'technician@msplassist.local' } });
    const rider = await prisma.deployment.findFirst({ where: { rentalStatus: 'ACTIVE' }, include: { customer: true } });
    const category = await prisma.issueCategory.findFirst({ where: { active: true } });
    if (!rider || !category) throw new Error('No active deployment or issue category found in the target database.');

    // 1. Ticket creation
    const creation = await request(app).post('/api/v1/tickets/conversation').set('Authorization', coordinatorAuth).send({
      registeredMobile: rider.customer.registeredMobile,
      mvTrackNumber: rider.mvTrackNumber,
      vehicleNumber: rider.vehicleNumber,
      rideabilityStatus: 'NOT_MOVABLE',
      issueGroups: [{ issueCategoryId: category.id, issueSubcategory: 'Smoke v2', description: 'Smoke v2 issue' }],
      remarks: 'UAT workflow v2 smoke test',
      photoReferences: [],
      conversationMetadata: { smokeTestV2: true },
    });
    ticketId = creation.body?.data?.ticketId;
    pass('Ticket creation', creation.status === 201 && Boolean(ticketId));

    // 2. Coordinator Workbench shows the new (CREATED) ticket
    const workbenchBefore = await request(app).get('/api/v1/coordinator/tickets').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 100 });
    pass('Coordinator Workbench shows CREATED ticket', workbenchBefore.body?.data?.items?.some((item) => item.id === ticketId));

    // 3. Assign Service TL
    const assign = await request(app).post(`/api/v1/tickets/${ticketId}/assign-service-tl`).set('Authorization', coordinatorAuth).send({ serviceTlId: fixtures.serviceTl.id });
    pass('Assign Service TL', assign.status === 200 && assign.body?.data?.newStage === 'SERVICE_TL_REVIEW');

    // 4. Ticket disappears from Coordinator Workbench (UAT-008)
    const workbenchAfter = await request(app).get('/api/v1/coordinator/tickets').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 100 });
    pass('Ticket leaves Coordinator Workbench after assignment', !workbenchAfter.body?.data?.items?.some((item) => item.id === ticketId));

    // 5. Workshop Required -> auto Job Card
    const workshop = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/require-workshop`).set('Authorization', serviceTlAuth).send({ technicianId: technician.id });
    pass('Workshop Required auto-creates Job Card', workshop.status === 200 && workshop.body?.data?.newStage === 'IN_PROGRESS');

    // 5b. Workshop Workbench: new Job Card is searchable and shows as "Assigned to Technician" (untouched)
    const workbenchJobCardId = workshop.body?.data?.jobCardId;
    const jobCardNumberRow = await prisma.jobCard.findUnique({ where: { id: workbenchJobCardId }, select: { jobCardNumber: true } });
    const searchByJobCardNumber = await request(app).get('/api/v1/workshop-dashboard/job-cards').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 10, search: jobCardNumberRow.jobCardNumber });
    pass('Workshop Workbench search finds the new Job Card by Job Card Number', searchByJobCardNumber.body?.data?.items?.some((item) => item.jobCardId === workbenchJobCardId));
    const searchByTicketNumber = await request(app).get('/api/v1/workshop-dashboard/job-cards').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 10, search: creation.body.data.ticketNumber });
    pass('Workshop Workbench search finds the new Job Card by Ticket Number', searchByTicketNumber.body?.data?.items?.some((item) => item.jobCardId === workbenchJobCardId));
    const searchByMobile = await request(app).get('/api/v1/workshop-dashboard/job-cards').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 10, search: rider.customer.registeredMobile });
    pass('Workshop Workbench search finds the new Job Card by Rider Mobile Number', searchByMobile.body?.data?.items?.some((item) => item.jobCardId === workbenchJobCardId));
    const beforeEditStatus = await request(app).get('/api/v1/workshop-dashboard/job-cards').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 10, status: 'ASSIGNED', search: jobCardNumberRow.jobCardNumber });
    pass('Untouched new Job Card is classified as Assigned to Technician', beforeEditStatus.body?.data?.items?.some((item) => item.jobCardId === workbenchJobCardId));

    // 6. Service TL completes the Job Card (Initial Observation, Root Cause, Other Requirements, ETA)
    const jcSave = await request(app).patch(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', serviceTlAuth).send({
      initialObservation: 'Smoke v2 observation',
      rootCause: 'Smoke v2 root cause',
      otherRequirements: 'Smoke v2 other requirements',
      estimatedCompletionAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    pass('Service TL can save Job Card diagnostic fields', jcSave.status === 200 && jcSave.body?.data?.otherRequirements === 'Smoke v2 other requirements');

    // 6a2. Workshop Workbench: now that it's been edited, it should read as "In Progress" not "Assigned to Technician"
    const afterEditStatus = await request(app).get('/api/v1/workshop-dashboard/job-cards').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 10, status: 'IN_PROGRESS', search: jobCardNumberRow.jobCardNumber });
    pass('Edited Job Card reclassifies from Assigned to In Progress', afterEditStatus.body?.data?.items?.some((item) => item.jobCardId === workbenchJobCardId));

    // 6b. Technician is forbidden from saving those same fields directly (approved fields only)
    const techAttemptDiagnostic = await request(app).patch(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth).send({ rootCause: 'Technician should not be able to set this' });
    pass('Technician diagnostic-field edit is silently ignored (approved fields only)', techAttemptDiagnostic.status === 200 && techAttemptDiagnostic.body?.data?.rootCause === 'Smoke v2 root cause');

    // 6c. Technician is forbidden from saving spare parts
    const techAttemptParts = await request(app).put(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts`).set('Authorization', technicianAuth).send({ items: [{ partId: fixtures.part.id, requiredQuantity: 1 }] });
    pass('Technician spare-parts save is forbidden', techAttemptParts.status === 403);

    // 7. Service TL saves Spare Parts
    const spareParts = await request(app).put(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts`).set('Authorization', serviceTlAuth).send({ items: [{ partId: fixtures.part.id, requiredQuantity: 1 }] });
    pass('Service TL spare parts save', spareParts.status === 200 && spareParts.body?.data?.spareParts?.length === 1);

    // 8. Job Card appears in Technician Console (UAT-006)
    const jobCardsForTech = await request(app).get('/api/v1/job-cards').set('Authorization', technicianAuth);
    pass('Job Card appears in Technician Console', jobCardsForTech.body?.data?.some((jc) => jc.ticketId === ticketId));

    // 9. Technician can update approved fields (workPerformed, technicianRemarks)
    const techApproved = await request(app).patch(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card`).set('Authorization', technicianAuth).send({ workPerformed: 'Replaced brake pad', technicianRemarks: 'All good' });
    pass('Technician can save approved fields', techApproved.status === 200 && techApproved.body?.data?.workPerformed === 'Replaced brake pad');

    // 10. Print PDF still works and records history
    const pdf = await request(app).get(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/pdf`).set('Authorization', technicianAuth);
    pass('Print PDF', pdf.status === 200 && pdf.headers['content-type'] === 'application/pdf');

    // 11. Technician Mark Complete (IN_PROGRESS -> COMPLETED)
    const markCompleted = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/mark-completed`).set('Authorization', technicianAuth).send({ completedByName: 'Ravi Technician', actualCompletionAt: new Date().toISOString() });
    pass('Technician Mark Complete', markCompleted.status === 200 && markCompleted.body?.data?.newStage === 'COMPLETED');

    // 11b. Technician cannot perform Final Verification (readyForDeployment)
    const techFinalAttempt = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/ready-for-deployment`).set('Authorization', technicianAuth).send({ completedByName: 'x', actualCompletionAt: new Date().toISOString() });
    pass('Technician cannot perform Final Verification', techFinalAttempt.status === 403);

    // 12. Service TL Final Verification -> RFD
    const finalVerification = await request(app).post(`/api/v1/workshop-workspace/tickets/${ticketId}/job-card/ready-for-deployment`).set('Authorization', serviceTlAuth).send({ completedByName: 'Ravi Technician', actualCompletionAt: new Date().toISOString() });
    pass('Service TL Final Verification -> RFD', finalVerification.status === 200 && finalVerification.body?.data?.newStage === 'RFD');

    // 13. Ticket returns to Coordinator Workbench at RFD
    const workbenchRfd = await request(app).get('/api/v1/coordinator/tickets').set('Authorization', coordinatorAuth).query({ page: 1, pageSize: 100 });
    pass('Ticket returns to Coordinator Workbench at RFD', workbenchRfd.body?.data?.items?.some((item) => item.id === ticketId));

    // 13b. Service TL/Technician can no longer close the ticket (Coordinator-only now)
    const stlCloseAttempt = await request(app).post(`/api/v1/tickets/${ticketId}/close-decision`).set('Authorization', serviceTlAuth).send({ decision: 'YES' });
    pass('Service TL cannot close the ticket', stlCloseAttempt.status === 403);

    // 14. Coordinator closes the ticket
    const closure = await request(app).post(`/api/v1/tickets/${ticketId}/close-decision`).set('Authorization', coordinatorAuth).send({ decision: 'YES' });
    pass('Coordinator closes the ticket', closure.status === 200 && closure.body?.data?.closed === true);

    const ticketAfterClose = await prisma.ticket.findUnique({ where: { id: ticketId } });
    pass('Ticket closedAt persisted', Boolean(ticketAfterClose.closedAt));
  } catch (error) {
    pass('Smoke test execution', error instanceof Error ? error.message : String(error));
  } finally {
    try { pass('Ticket cleanup', await cleanupTicket(ticketId)); } catch (error) { pass('Ticket cleanup', error instanceof Error ? error.message : String(error)); }
    try { if (fixtures) { await cleanupFixtures(fixtures); pass('Fixture cleanup', true); } } catch (error) { pass('Fixture cleanup', error instanceof Error ? error.message : String(error)); }
  }

  console.table(checks);
  const failed = Object.entries(checks).filter(([, value]) => value !== 'PASS');
  console.log(failed.length ? `Smoke test: FAIL (${failed.length} check(s))` : 'Smoke test: PASS');
  if (failed.length) process.exitCode = 1;
}

run().finally(() => prisma.$disconnect());
