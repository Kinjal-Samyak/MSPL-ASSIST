const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  email: "admin@msplassist.com",
  name: "Administrator",
  mobile: "admin@msplassist.com",
  password: process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123",
};

const bcryptSaltRounds = Number(process.env.AUTH_BCRYPT_SALT_ROUNDS || 12);

async function upsertMasterData() {
  const statuses = [
    { name: "Open", displayOrder: 1, customerVisible: false, active: true },
    { name: "Assigned", displayOrder: 2, customerVisible: false, active: true },
    { name: "Inspection", displayOrder: 3, customerVisible: false, active: true },
    { name: "Repair In Progress", displayOrder: 4, customerVisible: false, active: true },
    { name: "Ready for Delivery", displayOrder: 5, customerVisible: false, active: true },
    { name: "Completed", displayOrder: 6, customerVisible: true, active: true },
    { name: "Closed", displayOrder: 7, customerVisible: true, active: true },
    { name: "Cancelled", displayOrder: 8, customerVisible: true, active: true },
    { name: "Reopened", displayOrder: 9, customerVisible: true, active: true },
  ];

  for (const status of statuses) {
    await prisma.statusMaster.upsert({
      where: { name: status.name },
      update: {
        displayOrder: status.displayOrder,
        customerVisible: status.customerVisible,
        active: status.active,
      },
      create: status,
    });
  }

  const categories = [
    { name: "Battery", displayOrder: 1, active: true },
    { name: "Charging Issue", displayOrder: 2, active: true },
    { name: "Brake not working", displayOrder: 3, active: true },
    { name: "Tyre/Puncture", displayOrder: 4, active: true },
    { name: "Motor", displayOrder: 5, active: true },
    { name: "Throttle/Acceleration Issues", displayOrder: 6, active: true },
    { name: "Accident", displayOrder: 7, active: true },
    { name: "Other", displayOrder: 8, active: true },
  ];

  for (const category of categories) {
    await prisma.issueCategory.upsert({
      where: { name: category.name },
      update: {
        displayOrder: category.displayOrder,
        active: category.active,
      },
      create: category,
    });
  }

  const hubs = [
    { name: "Central Hub", city: "Mumbai", state: "Maharashtra", active: true },
    { name: "East Hub", city: "Kolkata", state: "West Bengal", active: true },
    { name: "South Hub", city: "Bengaluru", state: "Karnataka", active: true },
  ];

  for (const hub of hubs) {
    await prisma.hub.upsert({
      where: { name: hub.name },
      update: {
        city: hub.city,
        state: hub.state,
        active: hub.active,
      },
      create: hub,
    });
  }

  const models = [
    { modelCode: "HUM24SMT+", displayName: "HUM24SMT+", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "HUMSMT+", displayName: "HUMSMT+", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "KIVO24SMT+", displayName: "KIVO24SMT+", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "KIVOEASYSMT+", displayName: "KIVOEASYSMT+", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "KIVOEASYSMT+MR", displayName: "KIVOEASYSMT+MR", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "KIVOSMT+", displayName: "KIVOSMT+", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "URBNSMT+", displayName: "URBNSMT+", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "URBNSTD", displayName: "URBNSTD", manufacturer: "MV Motors", vehicleType: "Micro Mobility", active: true },
    { modelCode: "M7", displayName: "M7", manufacturer: "MV Motors", vehicleType: "High Speed", active: true },
    { modelCode: "MVF7", displayName: "MVF7", manufacturer: "MV Motors", vehicleType: "High Speed", active: true },
    { modelCode: "MODEL-100", displayName: "Eagle X1", manufacturer: "MV Motors", active: true },
    { modelCode: "MODEL-200", displayName: "Falcon R2", manufacturer: "MV Motors", active: true },
    { modelCode: "MODEL-300", displayName: "Sparrow S", manufacturer: "MV Motors", active: true },
    { modelCode: "MODEL-400", displayName: "Orion Z", manufacturer: "MV Motors", active: true },
    { modelCode: "MODEL-500", displayName: "Nimbus V", manufacturer: "MV Motors", active: true },
  ];

  for (const model of models) {
    await prisma.vehicleModel.upsert({
      where: { modelCode: model.modelCode },
      update: {
        displayName: model.displayName,
        manufacturer: model.manufacturer,
        vehicleType: model.vehicleType,
        active: model.active,
      },
      create: model,
    });
  }
}

/**
 * Example starting rental rates for Service Loss Analytics, effective from the app's earliest data so
 * every existing ticket resolves to a rate. These are illustrative config data an Admin is expected to
 * correct via the Vehicle Model rate management UI - not hardcoded calculation logic.
 */
async function upsertVehicleModelRates() {
  const rateByVehicleType = { "Micro Mobility": 700, "High Speed": 1400 };
  const defaultWeeklyRental = 900;
  const effectiveFrom = new Date("2025-01-01T00:00:00.000Z");

  const models = await prisma.vehicleModel.findMany({ select: { id: true, vehicleType: true } });
  for (const model of models) {
    const existing = await prisma.vehicleModelRate.findFirst({ where: { vehicleModelId: model.id } });
    if (existing) continue;

    const weeklyRental = rateByVehicleType[model.vehicleType] ?? defaultWeeklyRental;
    const dailyRental = Math.round((weeklyRental / 7) * 100) / 100;
    await prisma.vehicleModelRate.create({
      data: { vehicleModelId: model.id, weeklyRental, dailyRental, effectiveFrom, active: true },
    });
  }
}

async function upsertNotificationTemplates() {
  const templates = [
    {
      name: "Ticket Status Update - WhatsApp",
      eventType: "TICKET_STATUS_UPDATED",
      channel: "WHATSAPP",
      content:
        "Hi {{customerName}}, here's an update on your service ticket {{ticketNumber}}: your vehicle is currently {{status}}. We'll keep you posted!",
      active: true,
    },
    {
      name: "Ticket ETA Update - WhatsApp",
      eventType: "TICKET_ETA_UPDATED",
      channel: "WHATSAPP",
      content:
        "Hi {{customerName}}, your vehicle (ticket {{ticketNumber}}) is expected to be ready by {{eta}}. Thank you for your patience!",
      active: true,
    },
    {
      name: "Ticket Charges Update - WhatsApp",
      eventType: "TICKET_CHARGES_UPDATED",
      channel: "WHATSAPP",
      content:
        "Hi {{customerName}}, the estimated charges for your service ticket {{ticketNumber}} are Rs. {{totalCharges}}. Please reach out if you have any questions.",
      active: true,
    },
    {
      name: "Communication Center - Ticket Created",
      eventType: "TICKET_CREATED",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, we've received your service request. Ticket Number {{ticketNumber}}. Our team will review it shortly. Thank you.",
      active: true,
    },
    {
      name: "Communication Center - Ticket Assigned",
      eventType: "TICKET_ASSIGNED",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, your service ticket {{ticketNumber}} has been assigned to our Service Team for review. We'll update you as work progresses.",
      active: true,
    },
    {
      name: "Communication Center - Repair Started",
      eventType: "REPAIR_STARTED",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, repair work has started on your vehicle. Ticket Number {{ticketNumber}}. Hub {{hub}}. We'll keep you posted.",
      active: true,
    },
    {
      name: "Communication Center - Waiting for Parts",
      eventType: "WAITING_FOR_PARTS",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, your vehicle (Ticket {{ticketNumber}}) is currently waiting for a spare part to arrive. We'll notify you once repair resumes.",
      active: true,
    },
    {
      name: "Communication Center - Work Completed",
      eventType: "WORK_COMPLETED",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, repair work on your vehicle (Ticket {{ticketNumber}}) is complete and is undergoing final checks before delivery.",
      active: true,
    },
    {
      name: "Communication Center - Ready for Delivery",
      eventType: "READY_FOR_DELIVERY",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, your vehicle is Ready for Delivery. Ticket Number {{ticketNumber}}. Hub {{hub}}. Please contact the Coordinator. Thank you.",
      active: true,
    },
    {
      name: "Communication Center - Ticket Closed",
      eventType: "TICKET_CLOSED",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, your service ticket {{ticketNumber}} has been closed. Thank you for choosing us - we hope you have a great ride!",
      active: true,
    },
    {
      name: "Communication Center - Ticket Cancelled",
      eventType: "TICKET_CANCELLED",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, your service ticket {{ticketNumber}} has been cancelled. Please contact the Coordinator if you have any questions.",
      active: true,
    },
    {
      name: "Communication Center - General Announcement",
      eventType: "GENERAL_ANNOUNCEMENT",
      channel: "WHATSAPP",
      content: "Hello {{customerName}}, regarding your service ticket {{ticketNumber}}: {{customMessage}}",
      active: true,
    },
    {
      name: "Communication Center - Vehicle Pending Pickup Reminder",
      eventType: "VEHICLE_PENDING_PICKUP_REMINDER",
      channel: "WHATSAPP",
      content:
        "Hello {{customerName}}, a reminder that your vehicle is ready and waiting for pickup at {{hub}}. Ticket Number {{ticketNumber}}. Please collect it at your earliest convenience.",
      active: true,
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { name: template.name },
      update: {
        eventType: template.eventType,
        channel: template.channel,
        content: template.content,
        active: template.active,
      },
      create: template,
    });
  }
}

const PERMISSION_CATALOG = [
  { code: "ADMIN_USERS_READ", description: "View user accounts and details.", category: "Users", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "COORDINATOR"] },
  { code: "ADMIN_USERS_WRITE", description: "Create, update, activate, deactivate, lock/unlock and reset passwords for users.", category: "Users", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "ADMIN_HUBS_READ", description: "View hub configuration.", category: "Hubs", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "COORDINATOR"] },
  { code: "ADMIN_HUBS_WRITE", description: "Create and update hub configuration.", category: "Hubs", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "ADMIN_SETTINGS_READ", description: "View application, notification and master settings.", category: "Settings", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "COORDINATOR"] },
  { code: "ADMIN_SETTINGS_WRITE", description: "Update application, notification and master settings.", category: "Settings", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "ADMIN_ROLES_PERMISSIONS_MANAGE", description: "View and modify the role/permission matrix.", category: "Roles & Permissions", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_SEARCH", description: "Search and view any ticket for operations administration.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_DELETE", description: "Soft-delete a ticket with a mandatory reason.", category: "Operations Administration", defaultRoles: ["ADMIN"] },
  { code: "OPS_TICKETS_RESTORE", description: "Restore a soft-deleted ticket.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_FORCE_CLOSE", description: "Force-close a ticket outside the normal workflow.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_REASSIGN", description: "Reassign a ticket's Service TL or Technician.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_JOBCARDS_UNLOCK_RFD", description: "Unlock a Ready for Delivery job card back to in-progress.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "AUDIT_LOGS_READ", description: "View the centralized audit log.", category: "Audit", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "PROCUREMENT_SUPPLIERS_READ", description: "View the supplier master.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_SUPPLIERS_WRITE", description: "Create and update suppliers.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_REQUESTS_READ", description: "View procurement requests.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_REQUESTS_WRITE", description: "Raise a procurement request.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_REQUESTS_APPROVE", description: "Approve or reject a procurement request.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PURCHASE_ORDERS_READ", description: "View purchase orders.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PURCHASE_ORDERS_WRITE", description: "Create and edit draft purchase orders.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PURCHASE_ORDERS_ISSUE", description: "Issue or cancel a purchase order.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
];

const ALL_ROLES = ["ADMIN", "COORDINATOR", "TECHNICIAN", "SERVICE_TL", "SERVICE_MANAGER"];

async function upsertPermissions() {
  for (const entry of PERMISSION_CATALOG) {
    const permission = await prisma.permission.upsert({
      where: { code: entry.code },
      update: { description: entry.description, category: entry.category },
      create: { code: entry.code, description: entry.description, category: entry.category },
    });

    for (const role of ALL_ROLES) {
      const granted = entry.defaultRoles.includes(role);
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: permission.id } },
        update: {},
        create: { role, permissionId: permission.id, granted },
      });
    }
  }
}

async function upsertAdministrator(client = prisma) {
  const existingAdministrator = await client.user.findUnique({
    where: { email: DEFAULT_ADMIN.email },
    select: { passwordHash: true },
  });

  const passwordHash =
    existingAdministrator?.passwordHash ||
    (await bcrypt.hash(DEFAULT_ADMIN.password, bcryptSaltRounds));

  await client.user.upsert({
    where: { email: DEFAULT_ADMIN.email },
    update: {
      name: DEFAULT_ADMIN.name,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
    create: {
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      mobile: DEFAULT_ADMIN.mobile,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  return existingAdministrator ? "already-exists" : "created";
}

async function seed() {
  await upsertMasterData();
  await upsertVehicleModelRates();
  await upsertNotificationTemplates();
  await upsertPermissions();
  const administratorResult = await upsertAdministrator();

  console.log("✓ Status Master Seeded");
  console.log("✓ Issue Categories Seeded");
  console.log("✓ Hubs Seeded");
  console.log("✓ Vehicle Models Seeded");
  console.log("✓ Vehicle Model Rates Seeded");
  console.log("✓ Notification Templates Seeded");
  console.log("✓ Permissions Seeded");
  console.log(
    administratorResult === "created"
      ? "✓ Administrator Created"
      : "✓ Administrator Already Exists"
  );
}

if (require.main === module) {
  seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
}

module.exports = { DEFAULT_ADMIN, upsertAdministrator };
