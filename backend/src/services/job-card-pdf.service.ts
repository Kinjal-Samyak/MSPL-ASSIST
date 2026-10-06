import PDFDocument from "pdfkit";
import type { JobCardDetailDto } from "../dto/ticket-workflow.dto";

const PRE_DELIVERY_INSPECTION_CHECKLIST = [
  "Brakes (Front & Rear)",
  "Lights & Indicators",
  "Horn",
  "Tyres / Air Pressure",
  "Battery & Charging Port",
  "Throttle / Acceleration",
  "Body Panels & Mirrors",
  "General Cleaning",
];

export class JobCardPdfService {
  async render(jobCard: JobCardDetailDto): Promise<Buffer> {
    return this.renderDocument((doc) => this.writeContent(doc, jobCard));
  }

  async renderDeliveryNote(jobCard: JobCardDetailDto): Promise<Buffer> {
    return this.renderDocument((doc) => this.writeDeliveryNoteContent(doc, jobCard));
  }

  private async renderDocument(write: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    write(doc);
    doc.end();

    return done;
  }

  private writeContent(doc: PDFKit.PDFDocument, jobCard: JobCardDetailDto): void {
    doc.fontSize(16).text(`Job Card ${jobCard.jobCardNumber}`, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#555").text(`Linked Ticket: ${jobCard.ticketNumber}`);
    doc.text(`Created: ${new Date(jobCard.createdAt).toLocaleString()} | Created By: System`);
    doc.text(`Current Workflow Status: ${jobCard.workflowStage}`);
    doc.fillColor("black");
    doc.moveDown();

    this.section(doc, "Rider Details", [
      ["Rider Name", jobCard.rider.name],
      ["Mobile Number", jobCard.rider.mobile],
      ["MV Track Number", jobCard.rider.mvTrackNumber ?? "-"],
      ["Vehicle Type", jobCard.rider.vehicleType ?? "-"],
      ["Hub", jobCard.rider.hub ?? "-"],
    ]);

    this.section(doc, "Complaint Details", [
      ["Rideability Status", jobCard.complaint.rideabilityStatus ?? "-"],
      ["Issue Category", jobCard.complaint.issueCategory],
      ["Issue Subcategory", jobCard.complaint.issueSubcategory ?? "-"],
      ["Rider Remarks", jobCard.complaint.riderRemarks ?? "-"],
    ]);

    this.section(doc, "Assignment", [
      ["Assigned Service Engineer", jobCard.assignment.serviceTlName ?? "-"],
      ["Service Engineer Assigned Date & Time", jobCard.assignment.serviceTlAssignedAt ? new Date(jobCard.assignment.serviceTlAssignedAt).toLocaleString() : "-"],
      ["Assigned Technician", jobCard.technicianName],
      ["Technician Assigned Date & Time", new Date(jobCard.assignment.technicianAssignedAt).toLocaleString()],
    ]);

    this.section(doc, "Technician Inspection", [
      ["Initial Observation", jobCard.initialObservation ?? "-"],
      ["Root Cause", jobCard.rootCause ?? "-"],
      ["Work Performed / Parts Changed", jobCard.workPerformed ?? "-"],
      ["Technician Remarks", jobCard.technicianRemarks ?? "-"],
    ]);

    doc.fontSize(11).text("Spare Parts Required", { underline: true });
    doc.moveDown(0.3);
    if (jobCard.spareParts.length === 0) {
      doc.fontSize(9).text("No spare parts recorded.");
    } else {
      doc.fontSize(9);
      for (const part of jobCard.spareParts) {
        doc.text(`${part.partCode}  |  ${part.partName}  |  Required: ${part.requiredQuantity}`);
      }
    }
    doc.moveDown();

    this.section(doc, "Charges", [
      ["Labour Charges", jobCard.labourCharges ?? "-"],
      ["Parts Charges", jobCard.partsCharges ?? "-"],
      ["Other Charges", jobCard.otherCharges ?? "-"],
      ["Total Charges", jobCard.totalCharges ?? "-"],
    ]);

    this.section(doc, "ETA", [
      ["Estimated Completion", jobCard.estimatedCompletionAt ? new Date(jobCard.estimatedCompletionAt).toLocaleString() : "-"],
      ["Actual Completion", jobCard.actualCompletionAt ? new Date(jobCard.actualCompletionAt).toLocaleString() : "-"],
    ]);

    doc.moveDown();
    doc.fontSize(9).fillColor("#555").text("Completion Date: _______________     Completion Time: _______________");
    doc.moveDown(0.5);
    doc.text("Technician Signature: ___________________________________________");
    doc.fillColor("black");
  }

  private writeDeliveryNoteContent(doc: PDFKit.PDFDocument, jobCard: JobCardDetailDto): void {
    doc.fontSize(16).text(`Vehicle Delivery Note - ${jobCard.jobCardNumber}`, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#555").text(`Linked Ticket: ${jobCard.ticketNumber}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.fillColor("black");
    doc.moveDown();

    this.section(doc, "Rider & Vehicle Details", [
      ["Rider Name", jobCard.rider.name],
      ["Mobile Number", jobCard.rider.mobile],
      ["MV Track Number", jobCard.rider.mvTrackNumber ?? "-"],
      ["Vehicle Type", jobCard.rider.vehicleType ?? "-"],
      ["Hub", jobCard.rider.hub ?? "-"],
    ]);

    this.section(doc, "Summary of Jobs Performed", [
      ["Initial Observation", jobCard.initialObservation ?? "-"],
      ["Root Cause", jobCard.rootCause ?? "-"],
      ["Work Performed / Parts Changed", jobCard.workPerformed ?? "-"],
      ["Technician Remarks", jobCard.technicianRemarks ?? "-"],
      ["Completed By", jobCard.completedByName ?? "-"],
      ["Actual Completion", jobCard.actualCompletionAt ? new Date(jobCard.actualCompletionAt).toLocaleString() : "-"],
    ]);

    doc.fontSize(11).text("Spare Parts Used", { underline: true });
    doc.moveDown(0.3);
    if (jobCard.spareParts.length === 0) {
      doc.fontSize(9).text("No spare parts recorded.");
    } else {
      doc.fontSize(9);
      for (const part of jobCard.spareParts) {
        doc.text(`${part.partCode}  |  ${part.partName}  |  Quantity: ${part.requiredQuantity}`);
      }
    }
    doc.moveDown();

    this.section(doc, "Charges", [
      ["Labour Charges", jobCard.labourCharges ?? "-"],
      ["Parts Charges", jobCard.partsCharges ?? "-"],
      ["Other Charges", jobCard.otherCharges ?? "-"],
      ["Total Charges", jobCard.totalCharges ?? "-"],
    ]);

    doc.fontSize(11).text("Pre-Delivery Inspection", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);
    for (const item of PRE_DELIVERY_INSPECTION_CHECKLIST) {
      doc.text(`[   ]  ${item}`);
    }
    doc.moveDown();

    doc.fontSize(11).text("Vehicle Handover", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#555");
    doc.text("I confirm that I have received the vehicle described above after inspecting the work performed.");
    doc.moveDown();
    doc.text("Receiving Date: _______________     Receiving Time: _______________");
    doc.moveDown(0.8);
    doc.text("Customer Signature: ___________________________________________");
    doc.fillColor("black");
  }

  private section(doc: PDFKit.PDFDocument, title: string, rows: Array<[string, string]>): void {
    doc.fontSize(11).text(title, { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);
    for (const [label, value] of rows) {
      doc.text(`${label}: ${value}`);
    }
    doc.moveDown();
  }
}
