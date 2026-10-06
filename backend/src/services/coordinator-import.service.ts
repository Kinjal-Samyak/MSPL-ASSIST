import * as XLSX from "xlsx";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prismaClient } from "../database";
import { NotFoundError, UnprocessableEntityError, ValidationError } from "../errors";

const SERVICE_REGISTER_SHEET = "Service Register";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const REQUIRED_COLUMNS = {
  ticketNumber: ["ticket no", "ticket number"],
  status: ["status"],
  loginDate: ["complaint received/login date", "login date", "open date"],
  customerName: ["customer name", "rider name"],
  mobileNumber: ["customer contact number", "mobile number", "phone number", "registered mobile"],
};

type LegacyRow = Record<string, unknown>;
type PreviewRow = {
  rowNumber: number;
  ticketNumber: string;
  status: string;
  customerName: string;
  mobileNumber: string;
  loginDate: string;
  hub: string;
  workshop: string;
  issueDescription: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  action: "INSERT" | "UPDATE" | "DUPLICATE" | "INVALID";
};
type ImportIssue = { rowNumber: number; severity: "WARNING" | "ERROR"; errorType: string; description: string; suggestedFix: string; rowData?: LegacyRow };

const normaliseHeader = (value: unknown): string => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normaliseValue = (value: unknown): string => String(value ?? "").trim();
const normalisePhone = (value: unknown): string => normaliseValue(value).replace(/\D/g, "").slice(-10);

function findHeader(headers: string[], aliases: string[]): string | undefined {
  const normalisedAliases = aliases.map(normaliseHeader);
  return headers.find((header) => normalisedAliases.includes(normaliseHeader(header)));
}

function valueFor(row: LegacyRow, aliases: string[]): string {
  const normalisedAliases = aliases.map(normaliseHeader);
  const header = Object.keys(row).find((key) => normalisedAliases.includes(normaliseHeader(key)));
  return header ? normaliseValue(row[header]) : "";
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = normaliseValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(value: unknown): string {
  const date = parseDate(value);
  return date ? date.toISOString() : "";
}

function inferIssueCategory(description: string): string {
  const value = description.toLowerCase();
  if (value.includes("battery")) return "Battery";
  if (value.includes("motor")) return "Motor";
  if (value.includes("brake")) return "Brake not working";
  if (value.includes("tyre") || value.includes("tire") || value.includes("puncture")) return "Tyre/Puncture";
  if (value.includes("throttle") || value.includes("accelerat")) return "Throttle/Acceleration Issues";
  if (value.includes("charg")) return "Charging Issue";
  if (value.includes("accident")) return "Accident";
  return "Other";
}

export class CoordinatorImportService {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  private get importDb() {
    // The generated Prisma client is refreshed by the deployment migration. Keeping this cast
    // localized lets the isolated feature compile while a local development server holds the
    // current Windows Prisma engine binary open.
    return this.prisma as PrismaClient & { importBatch: any };
  }

  async uploadAndValidate(input: { fileName: string; fileSizeBytes: number; contentBase64: string; importedById?: string }) {
    if (!input.fileName.toLowerCase().endsWith(".xlsx")) throw new ValidationError("Only .xlsx files are supported.");
    if (!input.fileSizeBytes || input.fileSizeBytes > MAX_FILE_SIZE_BYTES) throw new ValidationError("The Excel file must be no larger than 10 MB.");

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(Buffer.from(input.contentBase64, "base64"), { type: "buffer", cellDates: true });
    } catch {
      throw new ValidationError("The uploaded file is not a readable Excel workbook.");
    }
    const sheetName = workbook.SheetNames.find((name) => normaliseHeader(name) === normaliseHeader(SERVICE_REGISTER_SHEET));
    if (!sheetName) throw new ValidationError(`Required worksheet \"${SERVICE_REGISTER_SHEET}\" was not found.`);
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    const headers = (matrix[0] ?? []).map(normaliseValue);
    if (matrix.length < 2) throw new ValidationError("The Service Register worksheet has no records.");
    const mapping = Object.fromEntries(Object.entries(REQUIRED_COLUMNS).map(([field, aliases]) => [field, findHeader(headers, aliases) ?? null]));
    const missing = Object.entries(mapping).filter(([, column]) => !column).map(([field]) => field);
    if (missing.length) throw new ValidationError("The workbook is missing required columns.", { missingColumns: missing, expectedSheet: SERVICE_REGISTER_SHEET });

    const rows = XLSX.utils.sheet_to_json<LegacyRow>(sheet, { defval: "", raw: false });
    const [existingTickets, validStatuses, issueCategories, hubs] = await Promise.all([
      this.prisma.ticket.findMany({ select: { ticketNumber: true } }),
      this.prisma.statusMaster.findMany({ where: { active: true }, select: { name: true } }),
      this.prisma.issueCategory.findMany({ where: { active: true }, select: { name: true } }),
      this.prisma.hub.findMany({ where: { active: true }, select: { name: true } }),
    ]);
    const existingTicketNumbers = new Set(existingTickets.map((ticket) => ticket.ticketNumber.toUpperCase()));
    const allowedStatuses = new Set(validStatuses.map((status) => status.name.toUpperCase()));
    const allowedCategories = new Set(issueCategories.map((category) => category.name));
    const allowedHubs = new Set(hubs.map((hub) => hub.name.toUpperCase()));
    const seenTickets = new Set<string>();
    const issues: ImportIssue[] = [];
    const previewRows: PreviewRow[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      if (Object.values(row).every((value) => !normaliseValue(value))) return;
      const ticketNumber = valueFor(row, REQUIRED_COLUMNS.ticketNumber);
      const status = valueFor(row, REQUIRED_COLUMNS.status);
      const customerName = valueFor(row, REQUIRED_COLUMNS.customerName);
      const mobileNumber = normalisePhone(valueFor(row, REQUIRED_COLUMNS.mobileNumber));
      const loginDateValue = valueFor(row, REQUIRED_COLUMNS.loginDate);
      const hub = valueFor(row, ["hub location"]);
      const workshop = valueFor(row, ["location", "workshop"]);
      const issueDescription = valueFor(row, ["cx voc", "issue category", "primary issue", "remarks"]);
      const vehicleNumber = valueFor(row, ["motor no", "motor number", "vehicle number"]);
      const mvTrackNumber = valueFor(row, ["vin no", "vin number", "mv track no"]);
      const errors: ImportIssue[] = [];
      if (!ticketNumber) errors.push({ rowNumber, severity: "ERROR", errorType: "Missing ticket number", description: "Ticket No. is required.", suggestedFix: "Enter a unique Ticket No.", rowData: row });
      if (!customerName) errors.push({ rowNumber, severity: "ERROR", errorType: "Missing rider", description: "Customer Name is required.", suggestedFix: "Enter the rider name.", rowData: row });
      if (!/^\d{10}$/.test(mobileNumber)) errors.push({ rowNumber, severity: "ERROR", errorType: "Invalid mobile number", description: "Customer Contact Number must contain a valid 10-digit mobile number.", suggestedFix: "Enter the registered 10-digit mobile number.", rowData: row });
      if (!parseDate(loginDateValue)) errors.push({ rowNumber, severity: "ERROR", errorType: "Invalid login date", description: "Complaint received/Login Date is invalid.", suggestedFix: "Enter a valid date.", rowData: row });
      if (!status || !allowedStatuses.has(status.toUpperCase())) errors.push({ rowNumber, severity: "ERROR", errorType: "Invalid status", description: `Status \"${status || "blank"}\" is not available in Status Master.`, suggestedFix: "Use an active Status Master value.", rowData: row });
      if (hub && !allowedHubs.has(hub.toUpperCase())) errors.push({ rowNumber, severity: "ERROR", errorType: "Unknown hub", description: `HUB Location \"${hub}\" is not available in Hub Master.`, suggestedFix: "Use an active Hub Master value or leave HUB Location blank for this legacy workbook.", rowData: row });
      const inferredCategory = inferIssueCategory(issueDescription);
      if (!allowedCategories.has(inferredCategory)) errors.push({ rowNumber, severity: "ERROR", errorType: "Unknown issue category", description: `Mapped issue category \"${inferredCategory}\" is not available in Issue Category Master.`, suggestedFix: "Create or activate the mapped Issue Category before importing.", rowData: row });

      let action: PreviewRow["action"] = "INSERT";
      const ticketKey = ticketNumber.toUpperCase();
      if (ticketNumber && seenTickets.has(ticketKey)) {
        action = "DUPLICATE";
        errors.push({ rowNumber, severity: "ERROR", errorType: "Duplicate ticket number", description: `Ticket No. \"${ticketNumber}\" appears more than once in this workbook.`, suggestedFix: "Keep only one row for each Ticket No.", rowData: row });
      } else if (ticketNumber) {
        seenTickets.add(ticketKey);
        if (existingTicketNumbers.has(ticketKey)) action = "UPDATE";
      }
      if (errors.length && action !== "DUPLICATE") action = "INVALID";
      issues.push(...errors);
      if (!hub && workshop) issues.push({ rowNumber, severity: "WARNING", errorType: "Hub not supplied", description: "HUB Location is blank; Location is retained as the workbook workshop value.", suggestedFix: "Populate HUB Location in future files if hub-level validation is required.", rowData: row });
      previewRows.push({ rowNumber, ticketNumber, status, customerName, mobileNumber, loginDate: isoDate(loginDateValue), hub, workshop, issueDescription, vehicleNumber, mvTrackNumber, action });
    });

    const counts = this.previewCounts(previewRows);
    const batch = await this.importDb.importBatch.create({
      data: {
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
        worksheetName: sheetName,
        status: "PREVIEWED",
        rowsFound: previewRows.length,
        rowsValid: counts.inserted + counts.updated,
        rowsInserted: counts.inserted,
        rowsUpdated: counts.updated,
        rowsDuplicate: counts.duplicate,
        rowsSkipped: counts.invalid + counts.duplicate,
        columnMapping: mapping,
        preview: { rows: previewRows, issues },
        importedById: input.importedById,
        errors: { create: issues.map((issue) => ({ ...issue, rowData: issue.rowData as Prisma.InputJsonValue | undefined })) },
      },
      include: { errors: true },
    });
    return this.toBatchDto(batch);
  }

  async getBatch(batchId: string) {
    const batch = await this.importDb.importBatch.findUnique({ where: { id: batchId }, include: { errors: { orderBy: { rowNumber: "asc" } }, importedBy: { select: { name: true, email: true } } } });
    if (!batch) throw new NotFoundError("Import batch was not found.");
    return this.toBatchDto(batch);
  }

  async getHistory() {
    const batches = await this.importDb.importBatch.findMany({ orderBy: { createdAt: "desc" }, include: { importedBy: { select: { name: true, email: true } } } });
    return batches.map((batch: any) => this.toBatchDto(batch));
  }

  async getErrorsCsv(batchId: string): Promise<string> {
    const batch = await this.importDb.importBatch.findUnique({ where: { id: batchId }, include: { errors: { orderBy: { rowNumber: "asc" } } } });
    if (!batch) throw new NotFoundError("Import batch was not found.");
    const esc = (value: unknown) => `\"${String(value ?? "").replace(/\"/g, '\"\"')}\"`;
    return ["Row Number,Severity,Error Type,Description,Suggested Fix", ...batch.errors.map((error: any) => [error.rowNumber, error.severity, error.errorType, error.description, error.suggestedFix].map(esc).join(","))].join("\n");
  }

  async commit(batchId: string) {
    const batch = await this.importDb.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundError("Import batch was not found.");
    if (batch.status === "COMPLETED") return this.getBatch(batchId);
    const preview = batch.preview as unknown as { rows?: PreviewRow[] } | null;
    const rows = preview?.rows ?? [];
    if (!rows.length) throw new UnprocessableEntityError("This import batch has no preview rows to commit.");
    const start = Date.now(); let inserted = 0; let updated = 0; let failed = 0;
    for (const row of rows.filter((candidate) => candidate.action === "INSERT" || candidate.action === "UPDATE")) {
      try { await this.upsertLegacyTicket(row); row.action === "INSERT" ? inserted++ : updated++; } catch { failed++; }
    }
    await this.importDb.importBatch.update({ where: { id: batchId }, data: { status: failed ? "FAILED" : "COMPLETED", rowsInserted: inserted, rowsUpdated: updated, rowsFailed: failed, durationMs: Date.now() - start, committedAt: new Date() } });
    return this.getBatch(batchId);
  }

  private async upsertLegacyTicket(row: PreviewRow): Promise<void> {
    const [status, category] = await Promise.all([
      this.prisma.statusMaster.findFirstOrThrow({ where: { name: { equals: row.status, mode: "insensitive" }, active: true } }),
      this.prisma.issueCategory.findFirstOrThrow({ where: { name: inferIssueCategory(row.issueDescription), active: true } }),
    ]);
    const existingCustomer = await this.prisma.customer.findFirst({ where: { registeredMobile: row.mobileNumber } });
    const customer = existingCustomer
      ? await this.prisma.customer.update({ where: { id: existingCustomer.id }, data: { name: row.customerName } })
      : await this.prisma.customer.create({ data: { name: row.customerName, registeredMobile: row.mobileNumber } });
    const deployment = row.mvTrackNumber || row.vehicleNumber ? await this.prisma.deployment.findFirst({ where: { customerId: customer.id, OR: [{ mvTrackNumber: row.mvTrackNumber }, { vehicleNumber: row.vehicleNumber }] } }) : null;
    await this.prisma.ticket.upsert({
      where: { ticketNumber: row.ticketNumber },
      update: { customerId: customer.id, deploymentId: deployment?.id, issueCategoryId: category.id, statusId: status.id, issueDescription: row.issueDescription || "Imported from Service Register", source: "ADMIN", closedAt: status.name.toUpperCase() === "CLOSED" ? new Date() : null },
      create: { ticketNumber: row.ticketNumber, customerId: customer.id, deploymentId: deployment?.id, issueCategoryId: category.id, statusId: status.id, source: "ADMIN", priority: "MEDIUM", issueDescription: row.issueDescription || "Imported from Service Register", deploymentVerified: Boolean(deployment), closedAt: status.name.toUpperCase() === "CLOSED" ? new Date() : null },
    });
  }

  private previewCounts(rows: PreviewRow[]) {
    return { inserted: rows.filter((row) => row.action === "INSERT").length, updated: rows.filter((row) => row.action === "UPDATE").length, duplicate: rows.filter((row) => row.action === "DUPLICATE").length, invalid: rows.filter((row) => row.action === "INVALID").length };
  }

  private toBatchDto(batch: any) {
    const preview = batch.preview as { rows?: PreviewRow[]; issues?: ImportIssue[] } | null;
    return { id: batch.id, fileName: batch.fileName, fileSizeBytes: batch.fileSizeBytes, worksheetName: batch.worksheetName, status: batch.status, rowsFound: batch.rowsFound, rowsValid: batch.rowsValid, rowsInserted: batch.rowsInserted, rowsUpdated: batch.rowsUpdated, rowsDuplicate: batch.rowsDuplicate, rowsSkipped: batch.rowsSkipped, rowsFailed: batch.rowsFailed, durationMs: batch.durationMs, columnMapping: batch.columnMapping, preview: preview ?? { rows: [] }, errors: batch.errors, importedBy: batch.importedBy, createdAt: batch.createdAt, committedAt: batch.committedAt };
  }
}
