import * as XLSX from "xlsx";
import { PartsImportEngine, PARTS_TEMPLATE_HEADERS } from "../../parts-import/parts-import.engine";

function buildWorkbook(headers: string[], rows: unknown[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Inventory");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("PartsImportEngine - INVENTORY", () => {
  const engine = new PartsImportEngine();

  it("should_accept_the_invoice_style_inventory_format", () => {
    const buffer = buildWorkbook(
      [...PARTS_TEMPLATE_HEADERS.INVENTORY],
      [["MEG700201", "M5 X 8mm BH", 1.69, 100, 169, "MSPL/24-25/U/111", "28-Nov-25"]]
    );

    const preview = engine.preview(buffer, "INVENTORY");

    expect(preview.errors).toHaveLength(0);
    expect(preview.totalRecords).toBe(1);
    expect(preview.validRecords).toBe(1);
    expect(preview.rows[0]["Part Code"]).toBe("MEG700201");
  });

  it("should_tolerate_extra_columns_beyond_the_required_set", () => {
    const buffer = buildWorkbook(
      [...PARTS_TEMPLATE_HEADERS.INVENTORY, "Warehouse Note"],
      [["MEG700201", "M5 X 8mm BH", 1.69, 100, 169, "MSPL/24-25/U/111", "28-Nov-25", "Extra info"]]
    );

    const preview = engine.preview(buffer, "INVENTORY");

    expect(preview.errors).toHaveLength(0);
    expect(preview.validRecords).toBe(1);
  });

  it("should_reject_a_file_missing_a_required_header", () => {
    const buffer = buildWorkbook(
      ["Part Code", "Part Name", "Quantity", "Invoice Number", "Invoice Date"],
      [["MEG700201", "M5 X 8mm BH", 100, "MSPL/24-25/U/111", "28-Nov-25"]]
    );

    const preview = engine.preview(buffer, "INVENTORY");

    expect(preview.errors.some((error) => error.column === "Rate")).toBe(true);
    expect(preview.errors.some((error) => error.column === "Amount")).toBe(true);
  });

  it("should_reject_a_negative_rate_or_amount", () => {
    const buffer = buildWorkbook(
      [...PARTS_TEMPLATE_HEADERS.INVENTORY],
      [["MEG700201", "M5 X 8mm BH", -1, 100, -169, "MSPL/24-25/U/111", "28-Nov-25"]]
    );

    const preview = engine.preview(buffer, "INVENTORY");

    expect(preview.errors.some((error) => error.column === "Rate")).toBe(true);
    expect(preview.errors.some((error) => error.column === "Amount")).toBe(true);
  });

  it("should_require_invoice_number_and_invoice_date_per_row", () => {
    const buffer = buildWorkbook([...PARTS_TEMPLATE_HEADERS.INVENTORY], [["MEG700201", "M5 X 8mm BH", 1.69, 100, 169, "", ""]]);

    const preview = engine.preview(buffer, "INVENTORY");

    expect(preview.errors.some((error) => error.column === "Invoice Number")).toBe(true);
    expect(preview.errors.some((error) => error.column === "Invoice Date")).toBe(true);
  });

  it("should_not_require_a_template_version_column", () => {
    const buffer = buildWorkbook(
      [...PARTS_TEMPLATE_HEADERS.INVENTORY],
      [["MEG700201", "M5 X 8mm BH", 1.69, 100, 169, "MSPL/24-25/U/111", "28-Nov-25"]]
    );

    const preview = engine.preview(buffer, "INVENTORY");

    expect(preview.errors.some((error) => error.column === "Template Version")).toBe(false);
  });
});
