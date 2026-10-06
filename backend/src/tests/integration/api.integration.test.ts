import request from "supertest";

jest.mock("../../middleware/auth.middleware", () => ({
  requireAccessToken: (req: any, _res: any, next: any) => {
    req.authUser = { userId: "admin-1", role: "ADMIN", email: "admin@msplassist.test" };
    req.headers["x-user-role"] = "ADMIN";
    next();
  },
  requireRoles: () => (_req: any, _res: any, next: any) => next(),
}));

import app from "../../app";
import { MasterService } from "../../services/master.service";
import { LookupService } from "../../services/lookup.service";
import { CustomerModuleService } from "../../services/customer-module.service";
import { TicketService } from "../../services/ticket.service";
import { VehicleService } from "../../services/vehicle.service";
import { DeploymentModuleService } from "../../services/deployment-module.service";
import { WorkshopService } from "../../services/workshop.service";
import { AdminService } from "../../services/admin.service";
import { NotificationService } from "../../services/notification.service";
import { ReportService } from "../../services/report.service";
import { AuthService } from "../../services/auth.service";
import { SyncService } from "../../services/sync.service";

describe("Integration - API Endpoints", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should_return_health_payload_on_get_health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toEqual({
      status: "ok",
      application: "MSPL Assist",
      version: "1.0.0",
      environment: "production",
    });
  });

  it("should_return_not_found_for_unknown_route", async () => {
    const response = await request(app).get("/unknown-path");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toEqual({
      error: "Resource not found",
    });
  });

  it("should_login_with_auth_contract", async () => {
    jest.spyOn(AuthService.prototype, "login").mockResolvedValue({
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@mspl.in",
        role: "ADMIN",
      },
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
      },
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "admin@mspl.in",
      password: "secret",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      user: {
        id: "user-1",
        role: "ADMIN",
      },
      tokens: {
        tokenType: "Bearer",
      },
    });
  });

  it("should_refresh_auth_tokens_contract", async () => {
    jest.spyOn(AuthService.prototype, "refresh").mockResolvedValue({
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@mspl.in",
        role: "ADMIN",
      },
      tokens: {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        tokenType: "Bearer",
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
      },
    });

    const response = await request(app).post("/api/v1/auth/refresh").send({
      refreshToken: "refresh-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tokens).toMatchObject({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
  });

  it("should_logout_with_auth_contract", async () => {
    jest.spyOn(AuthService.prototype, "logout").mockResolvedValue({
      loggedOutAt: "2026-07-10T09:30:00.000Z",
    });

    const response = await request(app).post("/api/v1/auth/logout").send({
      refreshToken: "refresh-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      loggedOutAt: "2026-07-10T09:30:00.000Z",
    });
  });

  it("should_return_current_user_contract", async () => {
    jest.spyOn(AuthService.prototype, "verifyAccessToken").mockReturnValue({
      userId: "user-1",
      role: "ADMIN",
      email: "admin@mspl.in",
      type: "access",
    });
    jest.spyOn(AuthService.prototype, "getCurrentUser").mockResolvedValue({
      id: "user-1",
      name: "Admin User",
      email: "admin@mspl.in",
      role: "ADMIN",
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: "user-1",
      role: "ADMIN",
    });
  });

  it("should_run_manual_sync_contract", async () => {
    jest.spyOn(AuthService.prototype, "verifyAccessToken").mockReturnValue({
      userId: "user-1",
      role: "ADMIN",
      email: "admin@mspl.in",
      type: "access",
    });
    jest.spyOn(SyncService.prototype, "runSync").mockResolvedValue({
      startTime: "2026-07-13T05:00:00.000Z",
      endTime: "2026-07-13T05:00:10.000Z",
      rowsRead: 50,
      rowsInserted: 20,
      rowsUpdated: 10,
      rowsSkipped: 15,
      rowsFailed: 5,
      executionTimeMs: 10000,
      status: "SUCCESS",
      trigger: "MANUAL",
    });

    const response = await request(app)
      .post("/api/v1/sync/run")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: "SUCCESS",
      trigger: "MANUAL",
      rowsRead: 50,
    });
  });

  it("should_return_sync_status_contract", async () => {
    jest.spyOn(AuthService.prototype, "verifyAccessToken").mockReturnValue({
      userId: "user-1",
      role: "ADMIN",
      email: "admin@mspl.in",
      type: "access",
    });
    jest.spyOn(SyncService.prototype, "getStatus").mockResolvedValue({
      lastSync: "2026-07-13T05:00:10.000Z",
      nextSync: "2026-07-13T05:15:00.000Z",
      durationMs: 10000,
      rowsProcessed: 50,
      rowsFailed: 5,
      currentStatus: "IDLE",
    });

    const response = await request(app)
      .get("/api/v1/sync/status")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      currentStatus: "IDLE",
      rowsProcessed: 50,
    });
  });

  it("should_return_sync_history_contract", async () => {
    jest.spyOn(AuthService.prototype, "verifyAccessToken").mockReturnValue({
      userId: "user-1",
      role: "ADMIN",
      email: "admin@mspl.in",
      type: "access",
    });
    jest.spyOn(SyncService.prototype, "getHistory").mockResolvedValue([
      {
        id: "sync-1",
        summary: {
          startTime: "2026-07-13T05:00:00.000Z",
          endTime: "2026-07-13T05:00:10.000Z",
          rowsRead: 50,
          rowsInserted: 20,
          rowsUpdated: 10,
          rowsSkipped: 15,
          rowsFailed: 5,
          executionTimeMs: 10000,
          status: "SUCCESS",
          trigger: "MANUAL",
        },
        rawEngineResult: {
          startedAt: "2026-07-13T05:00:00.000Z",
          finishedAt: "2026-07-13T05:00:10.000Z",
          durationMs: 10000,
          results: [],
        },
      },
    ]);

    const response = await request(app)
      .get("/api/v1/sync/history")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: "sync-1",
    });
  });

  it("should_return_statuses_contract", async () => {
    jest.spyOn(MasterService.prototype, "getStatuses").mockResolvedValue([
      {
        id: "status-1",
        name: "Open",
        displayOrder: 1,
        customerVisible: false,
        active: true,
        deletedAt: null,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
        updatedAt: new Date("2026-07-09T00:00:00.000Z"),
      } as any,
    ]);

    const response = await request(app).get("/api/v1/masters/statuses");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "status-1",
      name: "Open",
      displayOrder: 1,
      customerVisible: false,
      active: true,
    });
  });

  it("should_return_issue_categories_contract", async () => {
    jest.spyOn(MasterService.prototype, "getIssueCategories").mockResolvedValue([
      {
        id: "issue-1",
        name: "Battery",
        displayOrder: 1,
        active: true,
        deletedAt: null,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
        updatedAt: new Date("2026-07-09T00:00:00.000Z"),
      } as any,
    ]);

    const response = await request(app).get("/api/v1/masters/issue-categories");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "issue-1",
      name: "Battery",
      displayOrder: 1,
      active: true,
    });
  });

  it("should_return_hubs_contract", async () => {
    jest.spyOn(MasterService.prototype, "getHubs").mockResolvedValue([
      {
        id: "hub-1",
        name: "Central Hub",
        city: "Mumbai",
        state: "Maharashtra",
        active: true,
        deletedAt: null,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
        updatedAt: new Date("2026-07-09T00:00:00.000Z"),
      } as any,
    ]);

    const response = await request(app).get("/api/v1/masters/hubs");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "hub-1",
      name: "Central Hub",
      city: "Mumbai",
      state: "Maharashtra",
      active: true,
    });
  });

  it("should_return_vehicle_models_contract", async () => {
    jest.spyOn(MasterService.prototype, "getVehicleModels").mockResolvedValue([
      {
        id: "model-1",
        modelCode: "MODEL-100",
        displayName: "Eagle X1",
        manufacturer: "MV Motors",
        active: true,
        deletedAt: null,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
        updatedAt: new Date("2026-07-09T00:00:00.000Z"),
      } as any,
    ]);

    const response = await request(app).get("/api/v1/masters/vehicle-models");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "model-1",
      modelCode: "MODEL-100",
      displayName: "Eagle X1",
      manufacturer: "MV Motors",
      active: true,
    });
  });

  it("should_return_created_ticket_contract", async () => {
    jest.spyOn(TicketService.prototype, "createTicket").mockResolvedValue({
      existingTicket: false,
      ticketId: "ticket-1",
      ticketNumber: "MV-090726-001",
      createdAt: "2026-07-09T10:00:00.000Z",
    });

    const response = await request(app).post("/api/v1/tickets").send({
      registeredMobile: "9876543210",
      issueCategoryId: "issue-1",
      issueDescription: "Battery drains quickly",
    });

    expect(response.status).toBe(201);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toEqual({
      success: true,
      data: {
        existingTicket: false,
        ticketId: "ticket-1",
        ticketNumber: "MV-090726-001",
        createdAt: "2026-07-09T10:00:00.000Z",
      },
    });
  });

  it("should_return_existing_ticket_response_contract", async () => {
    jest.spyOn(TicketService.prototype, "createTicket").mockResolvedValue({
      existingTicket: true,
      ticketNumber: "MV-090726-001",
      currentStatus: "Open",
    });

    const response = await request(app).post("/api/v1/tickets").send({
      registeredMobile: "9876543210",
      issueCategoryId: "issue-1",
      issueDescription: "Battery drains quickly",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        existingTicket: true,
        ticketNumber: "MV-090726-001",
        currentStatus: "Open",
      },
    });
  });

  it("should_return_safe_error_response_when_ticket_service_throws", async () => {
    jest.spyOn(TicketService.prototype, "createTicket").mockRejectedValue(new Error("internal failure"));

    const response = await request(app).post("/api/v1/tickets").send({
      registeredMobile: "9876543210",
      issueCategoryId: "issue-1",
      issueDescription: "Battery drains quickly",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Internal server error",
    });
  });

  it("should_create_ticket_comment_contract", async () => {
    jest.spyOn(TicketService.prototype, "addComment").mockResolvedValue({
      id: "comment-1",
      ticketId: "ticket-1",
      commentType: "CUSTOMER",
      text: "Customer update",
      userName: "Coordinator",
      userRole: "COORDINATOR",
      createdAt: "2026-07-10T09:00:00.000Z",
    });

    const response = await request(app).post("/api/v1/tickets/ticket-1/comments").send({
      commentType: "CUSTOMER",
      text: "Customer update",
      userName: "Coordinator",
      userRole: "COORDINATOR",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: "comment-1",
      ticketId: "ticket-1",
      commentType: "CUSTOMER",
      text: "Customer update",
    });
  });

  it("should_return_ticket_attachments_contract", async () => {
    jest.spyOn(TicketService.prototype, "getAttachments").mockResolvedValue([
      {
        id: "att-1",
        ticketId: "ticket-1",
        fileName: "invoice.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        uploadedBy: "Coordinator",
        uploadedAt: "2026-07-10T09:00:00.000Z",
        fileReference: "attachment-ref://tickets/ticket-1/attachments/att-1",
      },
    ]);

    const response = await request(app).get("/api/v1/tickets/ticket-1/attachments");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "att-1",
      ticketId: "ticket-1",
      fileName: "invoice.pdf",
      fileType: "application/pdf",
    });
  });

  it("should_return_ticket_comments_contract", async () => {
    jest.spyOn(TicketService.prototype, "getComments").mockResolvedValue([
      {
        id: "comment-1",
        ticketId: "ticket-1",
        commentType: "INTERNAL",
        text: "Internal note",
        userName: "Coordinator",
        userRole: "COORDINATOR",
        createdAt: "2026-07-10T09:00:00.000Z",
      },
    ]);

    const response = await request(app).get("/api/v1/tickets/ticket-1/comments");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "comment-1",
      commentType: "INTERNAL",
      text: "Internal note",
    });
  });

  it("should_create_ticket_attachment_contract", async () => {
    jest.spyOn(TicketService.prototype, "addAttachment").mockResolvedValue({
      id: "att-1",
      ticketId: "ticket-1",
      fileName: "invoice.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      uploadedBy: "Coordinator",
      uploadedAt: "2026-07-10T09:00:00.000Z",
      fileReference: "attachment-ref://tickets/ticket-1/attachments/att-1",
    });

    const response = await request(app).post("/api/v1/tickets/ticket-1/attachments").send({
      fileName: "invoice.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      uploadedBy: "Coordinator",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: "att-1",
      fileName: "invoice.pdf",
      fileType: "application/pdf",
    });
  });

  it("should_return_ticket_notifications_contract", async () => {
    jest.spyOn(TicketService.prototype, "getNotifications").mockResolvedValue([
      {
        id: "notif-1",
        channel: "WHATSAPP",
        recipient: "9876543210",
        status: "SENT",
        sentTime: "2026-07-10T09:00:00.000Z",
        deliveryTime: "2026-07-10T09:02:00.000Z",
      },
    ]);

    const response = await request(app).get("/api/v1/tickets/ticket-1/notifications");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: "notif-1",
      channel: "WHATSAPP",
      recipient: "9876543210",
      status: "SENT",
    });
  });

  it("should_assign_technician_contract", async () => {
    jest.spyOn(TicketService.prototype, "assignTechnician").mockResolvedValue({
      ticketId: "ticket-1",
      technicianId: "tech-1",
      technicianName: "Tech One",
      assignmentNotes: "Urgent",
      assignedAt: "2026-07-10T09:00:00.000Z",
    });

    const response = await request(app).patch("/api/v1/tickets/ticket-1/assign-technician").send({
      technicianId: "tech-1",
      assignmentNotes: "Urgent",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      ticketId: "ticket-1",
      technicianId: "tech-1",
      technicianName: "Tech One",
    });
  });

  it("should_update_status_contract", async () => {
    jest.spyOn(TicketService.prototype, "updateStatus").mockResolvedValue({
      ticketId: "ticket-1",
      oldStatus: "Open",
      newStatus: "Assigned",
      updatedAt: "2026-07-10T09:10:00.000Z",
      remarks: "Assigned to technician",
    });

    const response = await request(app).patch("/api/v1/tickets/ticket-1/status").send({
      status: "Assigned",
      remarks: "Assigned to technician",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      ticketId: "ticket-1",
      oldStatus: "Open",
      newStatus: "Assigned",
    });
  });

  it("should_update_eta_contract", async () => {
    jest.spyOn(TicketService.prototype, "updateEta").mockResolvedValue({
      ticketId: "ticket-1",
      previousEta: "2026-07-11T09:00:00.000Z",
      newEta: "2026-07-12T09:00:00.000Z",
      reason: "Part delayed",
      updatedAt: "2026-07-10T09:20:00.000Z",
    });

    const response = await request(app).patch("/api/v1/tickets/ticket-1/eta").send({
      eta: "2026-07-12T09:00:00.000Z",
      reason: "Part delayed",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      ticketId: "ticket-1",
      reason: "Part delayed",
    });
  });

  it("should_update_charges_contract", async () => {
    jest.spyOn(TicketService.prototype, "updateCharges").mockResolvedValue({
      ticketId: "ticket-1",
      labourCharges: 500,
      partsCharges: 300,
      discount: 100,
      totalCharges: 700,
      updatedAt: "2026-07-10T09:30:00.000Z",
    });

    const response = await request(app).patch("/api/v1/tickets/ticket-1/charges").send({
      labourCharges: 500,
      partsCharges: 300,
      discount: 100,
      totalCharges: 700,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      ticketId: "ticket-1",
      totalCharges: 700,
    });
  });

  it("should_return_customer_search_contract", async () => {
    jest.spyOn(LookupService.prototype, "searchCustomers").mockResolvedValue({
      items: [
        {
          customerId: "cust-1",
          customerName: "Rider One",
          mobileNumber: "9876543210",
          hub: "Kolkata Hub",
          activeDeploymentCount: 1,
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const response = await request(app).get("/api/v1/customers/search?search=rider&page=1&pageSize=10");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      customerId: "cust-1",
      customerName: "Rider One",
      mobileNumber: "9876543210",
    });
  });

  it("should_return_customer_vehicles_contract", async () => {
    jest.spyOn(LookupService.prototype, "getCustomerVehicles").mockResolvedValue([
      {
        vehicleNumber: "WB12AB1234",
        vehicleModel: "Model X",
        batteryNumber: "BAT-001",
        hub: "Kolkata Hub",
        deploymentDate: "2026-07-10T10:00:00.000Z",
        rentalStatus: "ACTIVE",
      },
    ]);

    const response = await request(app).get("/api/v1/customers/cust-1/vehicles");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      vehicleNumber: "WB12AB1234",
      batteryNumber: "BAT-001",
    });
  });

  it("should_return_technician_lookup_contract", async () => {
    jest.spyOn(LookupService.prototype, "getTechnicians").mockResolvedValue([
      {
        technicianId: "tech-1",
        technicianName: "Tech One",
        mobileNumber: "9999999999",
        workshop: "Kolkata Hub",
        hub: "Kolkata Hub",
        availabilityStatus: "BUSY",
        currentActiveTickets: 2,
      },
    ]);

    const response = await request(app).get("/api/v1/technicians?hub=Kolkata&availability=BUSY");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      technicianId: "tech-1",
      availabilityStatus: "BUSY",
    });
  });

  it("should_return_issue_subcategory_lookup_contract", async () => {
    jest.spyOn(LookupService.prototype, "getIssueSubcategories").mockResolvedValue([
      {
        issueCategoryId: "issue-1",
        issueCategoryName: "Battery",
        group: "BATTERY",
        subcategories: ["Battery Not Charging"],
      },
    ]);

    const response = await request(app).get("/api/v1/issue-subcategories?issueCategoryId=issue-1");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      issueCategoryId: "issue-1",
      group: "BATTERY",
    });
  });

  it("should_return_customer_list_contract", async () => {
    jest.spyOn(CustomerModuleService.prototype, "getCustomers").mockResolvedValue({
      items: [
        {
          customerId: "cust-1",
          customerName: "Rider One",
          registeredMobile: "9876543210",
          alternateMobile: null,
          whatsAppNumber: null,
          email: null,
          status: "ACTIVE",
          activeDeploymentCount: 1,
          openTicketCount: 1,
          createdAt: "2026-07-10T09:00:00.000Z",
          updatedAt: "2026-07-10T09:00:00.000Z",
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      statusCounts: {
        ACTIVE: 1,
        INACTIVE: 0,
        SUSPENDED: 0,
      },
    });

    const response = await request(app).get("/api/v1/customers?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      customerId: "cust-1",
      customerName: "Rider One",
      status: "ACTIVE",
    });
  });

  it("should_return_customer_detail_contract", async () => {
    jest.spyOn(CustomerModuleService.prototype, "getCustomerById").mockResolvedValue({
      customerId: "cust-1",
      customerName: "Rider One",
      registeredMobile: "9876543210",
      alternateMobile: null,
      whatsAppNumber: null,
      email: null,
      address: null,
      status: "ACTIVE",
      activeDeploymentCount: 1,
      totalDeploymentCount: 1,
      openTicketCount: 1,
      totalTicketCount: 2,
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-10T09:00:00.000Z",
    });

    const response = await request(app).get("/api/v1/customers/cust-1");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      customerId: "cust-1",
      customerName: "Rider One",
    });
  });

  it("should_return_vehicle_dashboard_contract", async () => {
    jest.spyOn(VehicleService.prototype, "getDashboard").mockResolvedValue({
      totalVehicles: 10,
      availableVehicles: 6,
      deployedVehicles: 2,
      maintenanceVehicles: 1,
      workshopVehicles: 0,
      reservedVehicles: 0,
      inactiveVehicles: 1,
      revenueFleet: 2,
      readyForDeployment: 1,
      downFleet: 1,
      inventoryHold: 0,
      fleetUtilizationPercent: 20,
      availabilityPercent: 60,
      averageDowntimeHours: 0,
      mttrHours: 0,
      vehiclesReadyToday: 0,
      waitingForSpare: 0,
      repairInProgress: 0,
      qualityCheck: 0,
      vehiclesAgingOver72Hours: 0,
      readyForDeploymentBreakdown: {
        fromInventory: 1,
        fromService: 0,
        deployableToday: 1,
      },
      downFleetBreakdown: {
        inspection: 0,
        waitingForSpare: 0,
        workInProgress: 0,
        readyForDeployment: 1,
      },
      fleetHealth: {
        score: 100,
        label: "Excellent",
      },
      inventoryHoldBreakdown: {
        registrationPending: 0,
        insurancePending: 0,
        pdiPending: 0,
      },
    });

    const response = await request(app).get("/api/v1/vehicles/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalVehicles: 10,
      availableVehicles: 6,
    });
  });

  it("should_return_vehicle_list_contract", async () => {
    jest.spyOn(VehicleService.prototype, "getVehicles").mockResolvedValue({
      items: [
        {
          vehicleId: "MV-001",
          mvTrackNumber: "MV-001",
          vehicleNumber: "WB12AB1234",
          registrationNumber: null,
          modelName: "Model One",
          modelCode: "M-1",
          hubName: "Kolkata",
          status: "DEPLOYED",
          currentRiderName: "Rider One",
          updatedAt: "2026-07-10T00:00:00.000Z",
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const response = await request(app).get("/api/v1/vehicles?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      vehicleId: "MV-001",
      vehicleNumber: "WB12AB1234",
    });
  });

  it("should_return_deployment_dashboard_contract", async () => {
    jest.spyOn(DeploymentModuleService.prototype, "getDashboard").mockResolvedValue({
      totalDeployments: 8,
      activeDeployments: 3,
      pendingDeployments: 1,
      completedDeployments: 3,
      maintenanceDeployments: 1,
      deploymentsWithOpenTickets: 2,
    });

    const response = await request(app).get("/api/v1/deployments/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalDeployments: 8,
      activeDeployments: 3,
    });
  });

  it("should_return_deployment_list_contract", async () => {
    jest.spyOn(DeploymentModuleService.prototype, "getDeployments").mockResolvedValue({
      items: [
        {
          deploymentId: "dep-1",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          vehicleNumber: "WB12AB1234",
          mvTrackNumber: "MV-001",
          modelName: "Model One",
          modelCode: "M-1",
          hubName: "Kolkata",
          rentalStatus: "ACTIVE",
          vehicleStatus: "DEPLOYED",
          startedAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T01:00:00.000Z",
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const response = await request(app).get("/api/v1/deployments?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      deploymentId: "dep-1",
      customerName: "Rider One",
    });
  });

  it("should_return_workshop_dashboard_contract", async () => {
    jest.spyOn(WorkshopService.prototype, "getDashboard").mockResolvedValue({
      totalJobs: 10,
      openJobs: 3,
      assignedJobs: 2,
      inProgressJobs: 2,
      completedJobs: 2,
      cancelledJobs: 1,
    });

    const response = await request(app).get("/api/v1/workshop/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalJobs: 10,
      openJobs: 3,
    });
  });

  it("should_return_workshop_jobs_contract", async () => {
    jest.spyOn(WorkshopService.prototype, "getJobs").mockResolvedValue({
      items: [
        {
          jobId: "job-1",
          ticketNumber: "MV-010126-001",
          status: "Open",
          priority: "MEDIUM",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          deploymentId: "dep-1",
          vehicleNumber: "WB12AB1234",
          mvTrackNumber: "MV-001",
          vehicleStatus: "DEPLOYED",
          hubName: "Kolkata",
          technicianId: null,
          technicianName: null,
          issueCategory: "Battery",
          issueDescription: "Battery issue",
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T01:00:00.000Z",
          eta: null,
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const response = await request(app).get("/api/v1/workshop/jobs?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      jobId: "job-1",
      ticketNumber: "MV-010126-001",
    });
  });

  it("should_return_admin_dashboard_contract_for_admin", async () => {
    jest.spyOn(AdminService.prototype, "getDashboard").mockResolvedValue({
      totalUsers: 10,
      activeUsers: 9,
      inactiveUsers: 1,
      totalRoles: 3,
      totalPermissions: 6,
      totalHubs: 5,
      totalSettings: 8,
    });

    const response = await request(app).get("/api/v1/admin/dashboard").set("x-user-role", "ADMIN");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalUsers: 10,
      totalRoles: 3,
    });
  });

  it("should_return_admin_users_contract_for_admin", async () => {
    jest.spyOn(AdminService.prototype, "getUsers").mockResolvedValue({
      items: [
        {
          userId: "user-1",
          name: "Admin User",
          email: "admin@mspl.in",
          mobile: "9999999999",
          role: "ADMIN",
          active: true,
          hubIds: ["hub-1"],
          hubs: ["Kolkata"],
          department: null,
          locked: false,
          failedLoginAttempts: 0,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T01:00:00.000Z",
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const response = await request(app)
      .get("/api/v1/admin/users?page=1&pageSize=10")
      .set("x-user-role", "ADMIN");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      userId: "user-1",
      role: "ADMIN",
    });
  });

  it("should_return_notifications_dashboard_contract", async () => {
    jest.spyOn(NotificationService.prototype, "getDashboard").mockResolvedValue({
      totalNotifications: 10,
      pendingNotifications: 2,
      sentNotifications: 7,
      failedNotifications: 1,
      unreadNotifications: 4,
      archivedNotifications: 1,
      totalTemplates: 5,
      activeChannels: 4,
    });

    const response = await request(app).get("/api/v1/notifications/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalNotifications: 10,
      activeChannels: 4,
    });
  });

  it("should_send_notification_contract", async () => {
    jest.spyOn(NotificationService.prototype, "sendNotification").mockResolvedValue({
      notificationId: "notif-1",
      status: "SUCCESS",
      message: "Notification sent successfully.",
      updatedAt: "2026-07-10T12:00:00.000Z",
    });

    const response = await request(app).post("/api/v1/notifications/send").send({
      eventType: "TICKET_CREATED",
      sourceModule: "TICKET",
      sourceEntityId: "ticket-1",
      channel: "WHATSAPP",
      recipient: "+919999999999",
      message: "Ticket created",
    });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      notificationId: "notif-1",
      status: "SUCCESS",
    });
  });

  it("should_return_reports_dashboard_contract", async () => {
    jest.spyOn(ReportService.prototype, "getDashboard").mockResolvedValue({
      generatedAt: "2026-07-10T12:00:00.000Z",
      reports: [{ reportKey: "tickets", title: "Ticket Reports", totalRecords: 10 }],
      supportedExports: ["EXCEL", "CSV", "PDF"],
    });

    const response = await request(app).get("/api/v1/reports/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      supportedExports: ["EXCEL", "CSV", "PDF"],
    });
  });

  it("should_return_ticket_reports_contract", async () => {
    jest.spyOn(ReportService.prototype, "getTicketReports").mockResolvedValue({
      items: [
        {
          ticketId: "ticket-1",
          ticketNumber: "MV-001",
          customerName: "Rider One",
          vehicle: "WB12AB1234",
          hubName: "Kolkata",
          technicianName: "Tech One",
          status: "Open",
          category: "Battery",
          priority: "HIGH",
          createdAt: "2026-07-10T12:00:00.000Z",
          updatedAt: "2026-07-10T12:05:00.000Z",
        },
      ],
      totalRecords: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const response = await request(app).get("/api/v1/reports/tickets?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items[0]).toMatchObject({
      ticketId: "ticket-1",
      ticketNumber: "MV-001",
    });
  });
});
