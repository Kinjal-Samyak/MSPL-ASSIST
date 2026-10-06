import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import type { ServiceLossSummaryResponseDto, ServiceLossTicketRowDto } from "../dto/service-loss-analytics.dto";

export interface ExportFile {
  fileName: string;
  contentType: string;
  content: Buffer;
}

export class ServiceLossExportService {
  buildExcel(summary: ServiceLossSummaryResponseDto, rows: ServiceLossTicketRowDto[]): ExportFile {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.byVehicleModel.map((row) => ({
          "Vehicle Model": row.groupLabel,
          "Open Tickets": row.openTickets,
          "Total Tickets": row.totalTickets,
          "Average Downtime (days)": row.averageDowntime,
          "Total Service Loss (₹)": row.totalServiceLoss,
          "% Contribution": row.percentageContribution,
        }))
      ),
      "By Vehicle Model"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.byHub.map((row) => ({
          Hub: row.groupLabel,
          "Open Tickets": row.openTickets,
          "Total Tickets": row.totalTickets,
          "Average Downtime (days)": row.averageDowntime,
          "Total Service Loss (₹)": row.totalServiceLoss,
          "% Contribution": row.percentageContribution,
        }))
      ),
      "By Hub"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.monthlyTrend.map((row) => ({
          Month: row.month,
          "Total Tickets": row.totalTickets,
          "Average Downtime (days)": row.averageDowntime,
          "Service Loss (₹)": row.monthlyServiceLoss,
          "MoM Growth %": row.monthOnMonthGrowthPercent ?? "-",
          "Avg Service Loss / Ticket (₹)": row.averageServiceLossPerTicket,
        }))
      ),
      "Monthly Trend"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        rows.map((row) => ({
          "Ticket Number": row.ticketNumber,
          Rider: row.riderName,
          "Vehicle Number": row.vehicleNumber ?? "-",
          "Vehicle Model": row.vehicleModel,
          Hub: row.hub,
          "Service Engineer": row.serviceTl ?? "-",
          Technician: row.technician ?? "-",
          "Created Date": row.createdAt,
          "RFD Date": row.rfdAt ?? "-",
          "Downtime Days": row.downtimeDays,
          "Daily Rental (₹)": row.dailyRental,
          "Service Loss (₹)": row.serviceLoss,
          "SLA Status": row.slaStatus,
          Status: row.isOpen ? "Open" : "Closed",
        }))
      ),
      "Ticket Detail"
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return {
      fileName: `service-loss-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: buffer,
    };
  }

  async buildPdf(summary: ServiceLossSummaryResponseDto, rows: ServiceLossTicketRowDto[]): Promise<ExportFile> {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    doc.fontSize(16).text("Service Loss Analytics", { align: "left" });
    doc.fontSize(9).fillColor("#555").text(`Generated: ${new Date(summary.generatedAt).toLocaleString()}`);
    doc.fillColor("black").moveDown();

    doc.fontSize(11).text("Key Insights", { underline: true });
    doc.fontSize(9);
    for (const insight of summary.insights) {
      doc.text(`• ${insight.message}`);
    }
    doc.moveDown();

    doc.fontSize(11).text("SLA Compliance", { underline: true });
    doc.fontSize(9);
    doc.text(`Total Tickets: ${summary.slaCompliance.totalTickets}`);
    doc.text(`Within SLA: ${summary.slaCompliance.withinSla}`);
    doc.text(`Outside SLA: ${summary.slaCompliance.outsideSla}`);
    doc.text(`SLA Compliance: ${summary.slaCompliance.slaCompliancePercent}%`);
    doc.text(`Revenue Loss Due to SLA Breach: ₹${summary.slaCompliance.revenueLossDueToSlaBreach}`);
    doc.moveDown();

    doc.fontSize(11).text("Service Loss by Vehicle Model", { underline: true });
    doc.fontSize(9);
    for (const row of summary.byVehicleModel.slice(0, 15)) {
      doc.text(`${row.groupLabel}: ₹${row.totalServiceLoss} (${row.percentageContribution}%) · ${row.openTickets} open of ${row.totalTickets}`);
    }
    doc.moveDown();

    doc.fontSize(11).text("Service Loss by Hub", { underline: true });
    doc.fontSize(9);
    for (const row of summary.byHub.slice(0, 15)) {
      doc.text(`${row.groupLabel}: ₹${row.totalServiceLoss} (${row.percentageContribution}%) · ${row.openTickets} open of ${row.totalTickets}`);
    }
    doc.moveDown();

    doc.fontSize(11).text(`Ticket Detail (${rows.length} tickets)`, { underline: true });
    doc.fontSize(8);
    for (const row of rows.slice(0, 200)) {
      doc.text(
        `${row.ticketNumber} · ${row.vehicleModel} · ${row.hub} · ${row.downtimeDays}d · ₹${row.serviceLoss} · ${row.slaStatus} · ${row.isOpen ? "Open" : "Closed"}`
      );
    }
    if (rows.length > 200) {
      doc.text(`… and ${rows.length - 200} more (see Excel export for the full list).`);
    }

    doc.end();
    const content = await done;
    return {
      fileName: `service-loss-analytics-${new Date().toISOString().slice(0, 10)}.pdf`,
      contentType: "application/pdf",
      content,
    };
  }
}
