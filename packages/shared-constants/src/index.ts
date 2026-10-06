/**
 * Channel-neutral business vocabulary. Values are additive and preserve the
 * existing API/database representations; no persistence enum is changed here.
 */
export const ticketStatuses = [
  'OPEN', 'ASSIGNED', 'INSPECTION', 'IN_PROGRESS', 'WAITING_FOR_PARTS',
  'READY', 'DELIVERED', 'CLOSED', 'CANCELLED', 'NEW', 'ON_HOLD', 'RESOLVED',
] as const;
export type TicketStatus = typeof ticketStatuses[number];

export const workshopStatuses = ['INSPECTION', 'WAITING_FOR_SPARE', 'WORK_IN_PROGRESS', 'READY_FOR_DEPLOYMENT'] as const;
export type WorkshopStatus = typeof workshopStatuses[number];

export const rideabilityStatuses = ['RIDEABLE', 'NOT_RIDEABLE'] as const;
export type RideabilityStatus = typeof rideabilityStatuses[number];

/** Matches the existing Prisma Priority enum and workshop API contract. */
export const operationalPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type OperationalPriority = typeof operationalPriorities[number];

export const ticketSources = ['WHATSAPP', 'PHONE', 'WALK_IN', 'ADMIN'] as const;
export type TicketSource = typeof ticketSources[number];

export const conversationSteps = [
  'FIND_RIDER', 'CONFIRM_VEHICLE', 'RIDEABILITY', 'ISSUE_CATEGORY', 'ISSUE_SUBCATEGORY',
  'ISSUE_GROUPS', 'REMARKS', 'PHOTOS', 'REVIEW', 'SUCCESS',
] as const;
export type ConversationStep = typeof conversationSteps[number];

export const userRoles = ['ADMIN', 'COORDINATOR', 'TECHNICIAN', 'SERVICE_TL', 'SERVICE_MANAGER'] as const;
export type UserRole = typeof userRoles[number];

// Future-module vocabulary is centralised now, without changing current workflows.
export const issueSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IssueSeverity = typeof issueSeverities[number];
export const notificationTypes = ['TICKET_CREATED', 'TICKET_UPDATED', 'WORKSHOP_ASSIGNED', 'REMINDER'] as const;
export type NotificationType = typeof notificationTypes[number];
export const resolutionTypes = ['REPAIRED', 'REPLACED', 'NO_FAULT_FOUND', 'CLOSED'] as const;
export type ResolutionType = typeof resolutionTypes[number];
export const vehicleTypes = ['MICRO_MOBILITY', 'HIGH_SPEED'] as const;
export type VehicleType = typeof vehicleTypes[number];
export const hubTypes = ['SERVICE', 'DEPLOYMENT', 'MIXED'] as const;
export type HubType = typeof hubTypes[number];
export const technicianSkills = ['ELECTRICAL', 'MECHANICAL', 'BATTERY', 'BODY'] as const;
export type TechnicianSkill = typeof technicianSkills[number];
export const serviceDecisions = ['REPAIR', 'REPLACE', 'OBSERVE', 'ESCALATE'] as const;
export type ServiceDecision = typeof serviceDecisions[number];
export const jobCardStatuses = ['DRAFT', 'OPEN', 'COMPLETED', 'CANCELLED'] as const;
export type JobCardStatus = typeof jobCardStatuses[number];
export const inspectionStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export type InspectionStatus = typeof inspectionStatuses[number];
export const repairStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export type RepairStatus = typeof repairStatuses[number];
export const qualityCheckStatuses = ['PENDING', 'PASSED', 'FAILED'] as const;
export type QualityCheckStatus = typeof qualityCheckStatuses[number];
export const workshopSteps = ['CASE_CREATED', 'TECHNICIAN_ASSIGNED', 'INSPECTION', 'REPAIR', 'QUALITY_CHECK', 'READY_FOR_DEPLOYMENT'] as const;
export type WorkshopStep = typeof workshopSteps[number];

/** Permission identifiers are intentionally independent from the legacy Admin permission table. */
export const permissions = ['TICKET_READ', 'TICKET_CREATE', 'WORKSHOP_MANAGE', 'SETTINGS_MANAGE'] as const;
export type Permission = typeof permissions[number];

export const partsImportModes = ['INITIAL_IMPORT', 'ADD_STOCK', 'REPLACE_STOCK'] as const;
export type PartsImportMode = typeof partsImportModes[number];
export const partsChargingPolicies = ['WARRANTY', 'CONSUMABLE', 'CHARGEABLE'] as const;
export type PartsChargingPolicy = typeof partsChargingPolicies[number];
export const inventoryMovementTypes = ['INITIAL_IMPORT', 'ADD_STOCK', 'REPLACE_STOCK', 'RESERVATION', 'RELEASE', 'ISSUE'] as const;
export type InventoryMovementType = typeof inventoryMovementTypes[number];
