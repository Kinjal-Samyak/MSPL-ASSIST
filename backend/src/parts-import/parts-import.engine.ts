import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

export type PartsImportTemplateType = "CATALOG" | "INVENTORY";
export type PartsImportValidationIssue = { rowNumber: number; column?: string; reason: string };
export type PartsImportPreview = { sessionId: string; templateType: PartsImportTemplateType; templateVersion: string | null; recordsParsed: number; totalRecords: number; validRecords: number; invalidRecords: number; warnings: PartsImportValidationIssue[]; errors: PartsImportValidationIssue[]; previewData: Array<Record<string, unknown>>; rows: Array<Record<string, unknown>> };

export const PARTS_TEMPLATE_VERSION = "1.0";
/**
 * INVENTORY intentionally mirrors the rider-facing invoice format exactly (Part Code, Part Name,
 * Rate, Quantity, Amount, Invoice Number, Invoice Date) - no Hub/Import Mode/Remarks/Template
 * Version columns, since real inventory files never carry those. Extra columns beyond this set are
 * tolerated (not rejected) so more columns can be added to real files in future without breaking import.
 */
export const PARTS_TEMPLATE_HEADERS: Record<PartsImportTemplateType, readonly string[]> = {
  CATALOG: ["Part Code", "Part Name", "Description", "Part Category", "Part Subcategory", "Model Code", "Model Name", "Unit", "Part Cost", "Warranty Eligible", "Consumable", "Minimum Stock", "Reorder Level", "Maximum Stock", "Active", "Remarks", "Template Version"],
  INVENTORY: ["Part Code", "Part Name", "Rate", "Quantity", "Amount", "Invoice Number", "Invoice Date"],
};
export type ImportValidationProfile = { type: PartsImportTemplateType; requiredColumns: readonly string[]; validateRow: (row: Record<string, unknown>, rowNumber: number) => PartsImportValidationIssue[] };
const booleanFields = (row: Record<string, unknown>, rowNumber: number, fields: string[]) => fields.flatMap((field) => ["YES", "NO", "TRUE", "FALSE"].includes(String(row[field] ?? "").trim().toUpperCase()) ? [] : [{ rowNumber, column: field, reason: "Must be Yes or No." }]);
const nonNegativeNumberField = (row: Record<string, unknown>, rowNumber: number, field: string): PartsImportValidationIssue[] => { const value = Number(row[field]); return !Number.isFinite(value) || value < 0 ? [{ rowNumber, column: field, reason: `${field} must be a non-negative number.` }] : []; };
const requiredTextField = (row: Record<string, unknown>, rowNumber: number, field: string): PartsImportValidationIssue[] => !String(row[field] ?? "").trim() ? [{ rowNumber, column: field, reason: `${field} is required.` }] : [];
export const PARTS_IMPORT_PROFILES: Record<PartsImportTemplateType, ImportValidationProfile> = {
  CATALOG: { type: "CATALOG", requiredColumns: PARTS_TEMPLATE_HEADERS.CATALOG, validateRow: (row, rowNumber) => { const issues: PartsImportValidationIssue[] = []; if (!String(row["Part Name"] ?? "").trim()) issues.push({ rowNumber, column: "Part Name", reason: "Part Name is required." }); if (!String(row["Part Category"] ?? "").trim()) issues.push({ rowNumber, column: "Part Category", reason: "Part Category is required." }); if (!String(row.Unit ?? "").trim()) issues.push({ rowNumber, column: "Unit", reason: "Unit is required." }); const cost = Number(row["Part Cost"]); if (!Number.isFinite(cost) || cost < 0) issues.push({ rowNumber, column: "Part Cost", reason: "Part Cost must be a non-negative number." }); return issues.concat(booleanFields(row, rowNumber, ["Warranty Eligible", "Consumable", "Active"])); } },
  /** Parts unknown to the Catalog are auto-created from Part Code + Part Name (+ Rate as cost) on confirm - Amount is informational (Rate x Quantity) and not persisted. Invoice Number/Date are mandatory per row for traceability back to the source invoice. */
  INVENTORY: { type: "INVENTORY", requiredColumns: PARTS_TEMPLATE_HEADERS.INVENTORY, validateRow: (row, rowNumber) => [...requiredTextField(row, rowNumber, "Part Name"), ...nonNegativeNumberField(row, rowNumber, "Quantity"), ...nonNegativeNumberField(row, rowNumber, "Rate"), ...nonNegativeNumberField(row, rowNumber, "Amount"), ...requiredTextField(row, rowNumber, "Invoice Number"), ...requiredTextField(row, rowNumber, "Invoice Date")] },
};

/** Shared, side-effect-free parser used by both Parts import flows. */
export class PartsImportEngine {
  preview(buffer: Buffer, templateType: PartsImportTemplateType): PartsImportPreview {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets.Inventory ?? workbook.Sheets[workbook.SheetNames[0]];
    const sessionId = randomUUID(); const profile = PARTS_IMPORT_PROFILES[templateType];
    if (!sheet) return { sessionId, templateType, templateVersion: null, recordsParsed: 0, totalRecords: 0, validRecords: 0, invalidRecords: 0, warnings: [], errors: [{ rowNumber: 0, reason: "Workbook has no worksheet." }], previewData: [], rows: [] };
    const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    const headers = (values[0] ?? []).map((value) => String(value).trim());
    const expected = profile.requiredColumns;
    const errors: PartsImportValidationIssue[] = expected.filter((header) => !headers.includes(header)).map((header) => ({ rowNumber: 1, column: header, reason: "Required header is missing." }));
    if (errors.length) return { sessionId, templateType, templateVersion: null, recordsParsed: 0, totalRecords: 0, validRecords: 0, invalidRecords: 0, warnings: [], errors, previewData: [], rows: [] };
    const rows = values.slice(1).filter((row) => row.some((value) => String(value).trim() !== "")).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
    const requiresTemplateVersion = expected.includes("Template Version");
    const partCodes = new Set<string>();
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      if (requiresTemplateVersion) {
        const version = String(row["Template Version"] ?? "").trim();
        if (version !== PARTS_TEMPLATE_VERSION) errors.push({ rowNumber, column: "Template Version", reason: `Expected template version ${PARTS_TEMPLATE_VERSION}.` });
      }
      const partCode = String(row["Part Code"] ?? "").trim().toUpperCase();
      if (!partCode) errors.push({ rowNumber, column: "Part Code", reason: "Part Code is required." });
      /** Only the Catalog defines a part once - Inventory rows legitimately repeat a Part Code across invoices and are summed on confirm. */
      if (templateType === "CATALOG" && partCode && partCodes.has(partCode)) errors.push({ rowNumber, column: "Part Code", reason: "Duplicate Part Code in file." });
      partCodes.add(partCode);
      errors.push(...profile.validateRow(row, rowNumber));
    });
    const invalidRows = new Set(errors.filter((error) => error.rowNumber > 1).map((error) => error.rowNumber));
    return { sessionId, templateType, templateVersion: rows[0] ? String(rows[0]["Template Version"]) : null, recordsParsed: rows.length, totalRecords: rows.length, validRecords: rows.length - invalidRows.size, invalidRecords: invalidRows.size, warnings: [], errors, previewData: rows.slice(0, 50), rows };
  }
}
