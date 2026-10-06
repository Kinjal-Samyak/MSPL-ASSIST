import { CustomerModuleMapper } from "../../services/customer-module.mapper";

describe("CustomerModuleMapper", () => {
  it("should_map_customer_list_response", () => {
    const result = CustomerModuleMapper.toCustomerListResponse(
      [
        {
          id: "cust-1",
          name: "Rider One",
          registeredMobile: "9876543210",
          alternateMobile: null,
          whatsAppNumber: null,
          email: "rider@mail.com",
          status: "ACTIVE",
          createdAt: new Date("2026-07-10T09:00:00.000Z"),
          updatedAt: new Date("2026-07-10T10:00:00.000Z"),
          deployments: [{ id: "dep-1" }],
          tickets: [{ id: "ticket-1" }],
        },
      ] as any,
      1,
      1,
      10
    );

    expect(result.items[0]).toMatchObject({
      customerId: "cust-1",
      customerName: "Rider One",
      activeDeploymentCount: 1,
      openTicketCount: 1,
    });
  });

  it("should_map_customer_profile_and_documents", () => {
    const profile = CustomerModuleMapper.toCustomerProfile({
      id: "cust-1",
      name: "Rider One",
      registeredMobile: "9876543210",
      alternateMobile: null,
      whatsAppNumber: null,
      email: null,
      address: null,
      status: "ACTIVE",
      createdAt: new Date("2026-07-10T09:00:00.000Z"),
      updatedAt: new Date("2026-07-10T10:00:00.000Z"),
      deployments: [{ id: "dep-1", rentalStatus: "ACTIVE" }],
      tickets: [{ id: "t-1", status: { name: "Open" } }],
    } as any);

    expect(profile.activeDeploymentCount).toBe(1);
    expect(profile.openTicketCount).toBe(1);

    const documents = CustomerModuleMapper.toDocumentResponse(
      [
        {
          id: "doc-1",
          fileUrl: "mock://files/invoice.pdf",
          fileType: "application/pdf",
          uploadedAt: new Date("2026-07-10T10:00:00.000Z"),
          ticket: { id: "ticket-1", ticketNumber: "MV-1001" },
        },
      ] as any,
      1,
      1,
      10
    );

    expect(documents.items[0]).toMatchObject({
      documentId: "doc-1",
      ticketNumber: "MV-1001",
      fileName: "invoice.pdf",
    });
  });

  it("should_map_timeline_and_rentals", () => {
    const timeline = CustomerModuleMapper.toTimelineResponse(
      [
        {
          id: "a1",
          activityType: "Status Updated",
          description: "Moved to Assigned",
          performedAt: new Date("2026-07-10T10:00:00.000Z"),
          ticketId: "ticket-1",
        },
      ] as any,
      1,
      1,
      10
    );

    expect(timeline.items[0]).toMatchObject({
      eventType: "TICKET_ACTIVITY",
      title: "Ticket status updated",
    });

    const rentals = CustomerModuleMapper.toRentalHistoryResponse(
      [
        {
          id: "dep-1",
          vehicleNumber: "WB12AB1234",
          mvTrackNumber: "BAT-001",
          rentalStatus: "ACTIVE",
          createdAt: new Date("2026-07-10T10:00:00.000Z"),
          hub: { name: "Kolkata Hub" },
          vehicleModel: { displayName: "Model X" },
        },
      ] as any,
      1,
      1,
      10
    );

    expect(rentals.items[0]).toMatchObject({
      deploymentId: "dep-1",
      vehicleNumber: "WB12AB1234",
      batteryNumber: "BAT-001",
    });
  });
});
