import { JobCardPdfService } from "../../services/job-card-pdf.service";
import type { JobCardDetailDto } from "../../dto/ticket-workflow.dto";

function buildJobCard(): JobCardDetailDto {
  return {
    id: "jobcard-1",
    jobCardNumber: "JC-MV-001",
    ticketId: "ticket-1",
    ticketNumber: "MV-001",
    workflowStage: "IN_PROGRESS",
    effectiveStatus: "IN_PROGRESS",
    effectiveStatusLabel: "In Progress",
    technicianId: "tech-1",
    technicianName: "Ravi",
    createdAt: "2026-07-21T00:00:00.000Z",
    createdBy: "System",
    initialObservation: "Brake noise on left wheel",
    rootCause: "Worn brake pad",
    workPerformed: "Replaced brake pad",
    otherRequirements: null,
    technicianRemarks: "No further issues",
    labourCharges: "200",
    partsCharges: "300",
    otherCharges: "0",
    totalCharges: "500",
    estimatedCompletionAt: "2026-07-22T00:00:00.000Z",
    actualCompletionAt: null,
    completedByName: null,
    closureRemarks: null,
    version: 1,
    lastEditedAt: null,
    partsRequisitionNumber: "PR-JC-MV-001",
    partsRequisitionCreatedAt: "2026-07-21T00:00:00.000Z",
    partsRequisitionClosedAt: null,
    updatedAt: "2026-07-21T00:00:00.000Z",
    repairStartedAt: null,
    readyForDeliveryAt: null,
    readyForDeliveryByName: null,
    finalSparePartsAmount: null,
    finalBillingSnapshot: null,
    partsTimeline: [],
    spareParts: [
      {
        partId: "part-1",
        partCode: "BRK001",
        partName: "Brake Pad",
        availableQuantity: 18,
        requiredQuantity: 2,
        partCost: "450.00",
        insufficientStock: false,
        returnedQuantity: 0,
        remainingReturnable: 2,
        consumedQuantity: 0,
        unreconciledQuantity: 2,
        billableQuantity: 0,
        rate: "450.00",
        billableAmount: "0.00",
      },
    ],
    editable: true,
    rider: {
      name: "Asha",
      mobile: "9999900000",
      mvTrackNumber: "MV-T-1",
      vehicleModel: "M7",
      vehicleType: "High Speed",
      registrationNumber: null,
      hub: "Kolkata",
    },
    complaint: {
      rideabilityStatus: "MOVABLE",
      issueCategory: "Brake",
      issueSubcategory: "Brake Pad",
      riderRemarks: null,
      riderPhotos: [],
    },
    assignment: {
      serviceTlName: "Priya",
      serviceTlAssignedAt: "2026-07-20T00:00:00.000Z",
      technicianAssignedAt: "2026-07-21T00:00:00.000Z",
    },
  };
}

describe("JobCardPdfService", () => {
  it("should_render_a_non_empty_pdf_buffer_for_a_job_card", async () => {
    const service = new JobCardPdfService();

    const buffer = await service.render(buildJobCard());

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("should_render_without_throwing_when_optional_fields_are_missing", async () => {
    const service = new JobCardPdfService();
    const jobCard = { ...buildJobCard(), spareParts: [] };

    await expect(service.render(jobCard)).resolves.toBeInstanceOf(Buffer);
  });
});
