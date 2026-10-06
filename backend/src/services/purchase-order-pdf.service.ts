import PDFDocument from "pdfkit";
import type { PurchaseOrderDto } from "../dto/procurement.dto";

/** Mirrors JobCardPdfService's pdfkit pattern (job-card-pdf.service.ts) - buffered via the
 * `data`/`end` events, one `render` entry point per document type. */
export class PurchaseOrderPdfService {
  async render(purchaseOrder: PurchaseOrderDto): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    this.writeContent(doc, purchaseOrder);
    doc.end();

    return done;
  }

  private writeContent(doc: PDFKit.PDFDocument, po: PurchaseOrderDto): void {
    doc.fontSize(16).text(`Purchase Order ${po.poNumber}`, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#555").text(`Status: ${po.status}`);
    doc.text(`Created: ${new Date(po.createdAt).toLocaleString()} | Created By: ${po.createdByName}`);
    if (po.issuedAt) doc.text(`Issued: ${new Date(po.issuedAt).toLocaleString()}`);
    if (po.expectedDeliveryDate) doc.text(`Expected Delivery: ${new Date(po.expectedDeliveryDate).toLocaleDateString()}`);
    doc.fillColor("black");
    doc.moveDown();

    doc.fontSize(11).text("Supplier", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(po.supplierName);
    doc.moveDown();

    doc.fontSize(11).text("Line Items", { underline: true });
    doc.moveDown(0.3);

    const columnPositions = { part: 40, qty: 260, unitCost: 340, lineTotal: 440 };
    doc.fontSize(9).fillColor("#555");
    doc.text("Part", columnPositions.part, doc.y, { continued: true });
    doc.text("Qty", columnPositions.qty, doc.y, { continued: true });
    doc.text("Unit Cost", columnPositions.unitCost, doc.y, { continued: true });
    doc.text("Line Total", columnPositions.lineTotal, doc.y);
    doc.fillColor("black");
    doc.moveDown(0.2);

    for (const line of po.lines) {
      const rowY = doc.y;
      doc.fontSize(9).text(`${line.partCode} - ${line.partName}`, columnPositions.part, rowY, { width: 200 });
      doc.text(String(line.orderedQuantity), columnPositions.qty, rowY);
      doc.text(line.unitCost, columnPositions.unitCost, rowY);
      doc.text(line.lineTotal, columnPositions.lineTotal, rowY);
      doc.moveDown(0.4);
    }

    doc.moveDown(0.5);
    doc.fontSize(11).text(`Total: ${po.totalValue}`, { align: "right" });

    if (po.remarks) {
      doc.moveDown();
      doc.fontSize(10).text("Remarks", { underline: true });
      doc.fontSize(9).text(po.remarks);
    }
  }
}
