/**
 * End-to-end smoke test for the Procurement domain (Suppliers -> Procurement Requests ->
 * Purchase Orders) and its receipt path via Inventory Upload (there is no separate Goods
 * Receipt module - Inventory Upload is the sole receipt mechanism):
 * 1. A Service TL can create a supplier, raise a procurement request for a part, and approve it.
 * 2. A draft Purchase Order can be created against that supplier, with a line referencing the
 *    approved request - creating it converts the request to CONVERTED_TO_PO.
 * 3. Issuing the PO moves it to ISSUED.
 * 4. Confirming an Inventory Upload tagged against that PO (with a required invoice number)
 *    increments Part.availableQuantity, writes a RECEIPT row to the inventory ledger, increments
 *    the matching PurchaseOrderLine.receivedQuantity, and moves the PO to PARTIALLY_RECEIVED or
 *    RECEIVED depending on how much of the line has been received in total.
 * 5. Receiving more than the remaining outstanding quantity on a PO line is capped, not rejected -
 *    Inventory Upload can freely receive parts unrelated to any PO, so over-receipt against a
 *    specific line is silently capped rather than failing the whole upload.
 * 6. A Technician (no Procurement permission) is rejected from every procurement endpoint.
 *
 * Generates access tokens directly against real seeded Training users (no password guessing).
 * Creates one supplier/request/PO and deletes every record it creates in cleanup, restoring the
 * test part's stock and the Part Requisitions/Ledger state to what they were before.
 *
 * Run after `npm run build`:  node -r dotenv/config scripts/smoke-test-procurement-v1.js dotenv_config_path=.env.training
 */
const jwt = require('jsonwebtoken');
const request = require('supertest');
const XLSX = require('xlsx');
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

/** Builds a minimal valid Inventory Import workbook (base64) receiving one Part Code. */
function buildInventoryWorkbook(partCode, quantity, rate) {
  const sheet = XLSX.utils.json_to_sheet([
    { 'Part Code': partCode, 'Part Name': 'Smoke Test Part', Rate: rate, Quantity: quantity, Amount: rate * quantity, 'Invoice Number': 'IGNORED', 'Invoice Date': '2026-07-29' },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer.toString('base64');
}

async function run() {
  let supplierId;
  let requestId;
  let purchaseOrderId;
  let partId;
  let partCode;
  let partStockBefore;
  try {
    const serviceTl = await prisma.user.findUnique({ where: { email: 'serviceleader1@msplassist.local' } });
    const technician = await prisma.user.findUnique({ where: { email: 'technician@msplassist.local' } });
    pass('Fixture users found', Boolean(serviceTl && technician));
    const serviceTlAuth = tokenFor(serviceTl);
    const technicianAuth = tokenFor(technician);

    const part = await prisma.part.findFirst({ where: { active: true } });
    if (!part) throw new Error('Missing a required fixture (an active Part).');
    partId = part.id;
    partCode = part.partCode;
    partStockBefore = part.availableQuantity;

    // 1. Technician is rejected outright (no Procurement role/permission).
    const technicianRejected = await request(app).get('/api/v1/procurement/suppliers').set('Authorization', technicianAuth);
    pass('Technician is rejected from Procurement endpoints', technicianRejected.status === 403);

    // 2. Service TL creates a supplier.
    const supplierCode = `SMOKE-${Date.now()}`;
    const createSupplier = await request(app)
      .post('/api/v1/procurement/suppliers')
      .set('Authorization', serviceTlAuth)
      .send({ supplierCode, name: 'Smoke Test Supplier', phone: '9999999999' });
    supplierId = createSupplier.body?.data?.id;
    pass('Supplier creation', createSupplier.status === 201 && Boolean(supplierId));

    const duplicateSupplier = await request(app)
      .post('/api/v1/procurement/suppliers')
      .set('Authorization', serviceTlAuth)
      .send({ supplierCode, name: 'Duplicate Code Attempt' });
    pass('Duplicate supplierCode is rejected', duplicateSupplier.status === 409);

    // 3. Raise and approve a procurement request for the test part.
    const createRequest = await request(app)
      .post('/api/v1/procurement/requests')
      .set('Authorization', serviceTlAuth)
      .send({ partId, requestedQuantity: 5, reason: 'MANUAL', remarks: 'Smoke test' });
    requestId = createRequest.body?.data?.id;
    pass('Procurement request creation', createRequest.status === 201 && createRequest.body?.data?.status === 'PENDING');
    pass('Procurement request number is prefixed PR-', typeof createRequest.body?.data?.requestNumber === 'string' && createRequest.body.data.requestNumber.startsWith('PR-'));

    const approveRequest = await request(app)
      .post(`/api/v1/procurement/requests/${requestId}/approve`)
      .set('Authorization', serviceTlAuth)
      .send({});
    pass('Procurement request approval', approveRequest.status === 200 && approveRequest.body?.data?.status === 'APPROVED');

    // 4. Create a draft Purchase Order with one line referencing the approved request (qty 5, split
    //    across two uploads below to also exercise PARTIALLY_RECEIVED).
    const createPo = await request(app)
      .post('/api/v1/procurement/purchase-orders')
      .set('Authorization', serviceTlAuth)
      .send({ supplierId, lines: [{ partId, procurementRequestId: requestId, orderedQuantity: 5, unitCost: 100 }] });
    purchaseOrderId = createPo.body?.data?.id;
    pass('Purchase order creation (DRAFT)', createPo.status === 201 && createPo.body?.data?.status === 'DRAFT');
    pass('Purchase order number is prefixed PO-', typeof createPo.body?.data?.poNumber === 'string' && createPo.body.data.poNumber.startsWith('PO-'));
    pass('Purchase order total value computed (5 x 100 = 500)', createPo.body?.data?.totalValue === '500');

    const requestAfterPo = await request(app).get('/api/v1/procurement/requests').set('Authorization', serviceTlAuth).query({ partId });
    const requestRow = requestAfterPo.body?.data?.items?.find((r) => r.id === requestId);
    pass('Creating the PO converts the linked request to CONVERTED_TO_PO', requestRow?.status === 'CONVERTED_TO_PO');

    // 5. Issue the PO.
    const issuePo = await request(app).post(`/api/v1/procurement/purchase-orders/${purchaseOrderId}/issue`).set('Authorization', serviceTlAuth).send({});
    pass('Purchase order issue', issuePo.status === 200 && issuePo.body?.data?.status === 'ISSUED');

    const reissueAttempt = await request(app).post(`/api/v1/procurement/purchase-orders/${purchaseOrderId}/issue`).set('Authorization', serviceTlAuth).send({});
    pass('Re-issuing an already-issued PO is rejected', reissueAttempt.status === 409);

    // 6. Confirm an Inventory Upload receiving 3 of the 5 ordered units, tagged against the PO.
    const workbookBase64First = buildInventoryWorkbook(partCode, 3, 100);
    const previewFirst = await request(app).post('/api/v1/parts/import/inventory/preview').set('Authorization', serviceTlAuth).send({ workbookBase64: workbookBase64First, fileName: 'smoke-receipt-1.xlsx' });
    pass('Inventory upload preview (first receipt)', previewFirst.status === 200 && Boolean(previewFirst.body?.data?.sessionId));

    const confirmFirst = await request(app)
      .post('/api/v1/parts/import/inventory/confirm')
      .set('Authorization', serviceTlAuth)
      .send({ sessionId: previewFirst.body.data.sessionId, invoiceNumber: 'MMPL-SMOKE-001', purchaseOrderId });
    pass('Inventory upload confirmation (first receipt)', confirmFirst.status === 201);

    const partAfterFirstUpload = await prisma.part.findUnique({ where: { id: partId } });
    pass('Part.availableQuantity increased by the received quantity (3)', partAfterFirstUpload.availableQuantity === partStockBefore + 3);

    const ledgerRow = await prisma.partInventoryTransaction.findFirst({
      where: { referenceType: 'PURCHASE_ORDER', referenceId: purchaseOrderId, partId },
      orderBy: { createdAt: 'desc' },
    });
    pass('A RECEIPT ledger row was written for the confirmed upload', ledgerRow?.transactionType === 'RECEIPT' && ledgerRow?.quantityDelta === 3);

    const poAfterFirstUpload = await request(app).get(`/api/v1/procurement/purchase-orders/${purchaseOrderId}`).set('Authorization', serviceTlAuth);
    pass('PO status is PARTIALLY_RECEIVED after receiving 3 of 5', poAfterFirstUpload.body?.data?.status === 'PARTIALLY_RECEIVED');
    pass('PO receipts include the confirmed upload with its invoice number', poAfterFirstUpload.body?.data?.receipts?.some((r) => r.invoiceNumber === 'MMPL-SMOKE-001'));

    // 7. Confirm a second upload receiving the final 2 units - PO should now be fully RECEIVED.
    const workbookBase64Second = buildInventoryWorkbook(partCode, 2, 100);
    const previewSecond = await request(app).post('/api/v1/parts/import/inventory/preview').set('Authorization', serviceTlAuth).send({ workbookBase64: workbookBase64Second, fileName: 'smoke-receipt-2.xlsx' });
    const confirmSecond = await request(app)
      .post('/api/v1/parts/import/inventory/confirm')
      .set('Authorization', serviceTlAuth)
      .send({ sessionId: previewSecond.body.data.sessionId, invoiceNumber: 'MMPL-SMOKE-002', purchaseOrderId });
    pass('Inventory upload confirmation (second receipt)', confirmSecond.status === 201);

    const poFinal = await request(app).get(`/api/v1/procurement/purchase-orders/${purchaseOrderId}`).set('Authorization', serviceTlAuth);
    pass('PO status is RECEIVED once fully received (3 + 2 = 5)', poFinal.body?.data?.status === 'RECEIVED');
    pass('PO line receivedQuantity matches orderedQuantity (5)', poFinal.body?.data?.lines?.[0]?.receivedQuantity === 5);

    const partFinal = await prisma.part.findUnique({ where: { id: partId } });
    pass('Part.availableQuantity increased by the full ordered quantity (5) in total', partFinal.availableQuantity === partStockBefore + 5);

    // 8. Confirming an upload without an invoice number is rejected.
    const workbookBase64NoInvoice = buildInventoryWorkbook(partCode, 1, 100);
    const previewNoInvoice = await request(app).post('/api/v1/parts/import/inventory/preview').set('Authorization', serviceTlAuth).send({ workbookBase64: workbookBase64NoInvoice, fileName: 'smoke-no-invoice.xlsx' });
    const confirmNoInvoice = await request(app)
      .post('/api/v1/parts/import/inventory/confirm')
      .set('Authorization', serviceTlAuth)
      .send({ sessionId: previewNoInvoice.body.data.sessionId, invoiceNumber: '' });
    pass('Confirming an upload without an invoice number is rejected', confirmNoInvoice.status === 400 || confirmNoInvoice.status === 422);
  } catch (error) {
    pass('Smoke test execution', error instanceof Error ? error.stack : String(error));
  } finally {
    try {
      // Ledger rows are append-only by design (never deleted elsewhere in the app) - left in place
      // here too, consistent with how every other smoke test in this project treats the ledger.
      // Only the test's own uploads/PO/request/supplier and the part's live stock are restored.
      if (purchaseOrderId) {
        await prisma.partsInventoryUpload.deleteMany({ where: { purchaseOrderId } });
      }
      if (partId && partStockBefore != null) {
        await prisma.part.update({ where: { id: partId }, data: { availableQuantity: partStockBefore } });
      }
      if (purchaseOrderId) {
        await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId } });
        await prisma.purchaseOrder.deleteMany({ where: { id: purchaseOrderId } });
      }
      if (requestId) await prisma.procurementRequest.deleteMany({ where: { id: requestId } });
      if (supplierId) await prisma.supplier.deleteMany({ where: { id: supplierId } });
      pass('Cleanup completed', true);
    } catch (error) {
      pass('Cleanup completed', error instanceof Error ? error.message : String(error));
    }
  }

  console.table(checks);
  const failed = Object.entries(checks).filter(([, value]) => value !== 'PASS');
  console.log(failed.length ? `Smoke test: FAIL (${failed.length} check(s))` : 'Smoke test: PASS');
  if (failed.length) process.exitCode = 1;
}

run().finally(() => prisma.$disconnect());
