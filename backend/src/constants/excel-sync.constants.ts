export const EXCEL_SYNC_MASTER_DEPLOYMENT_CATEGORY = "EXCEL_SYNC_MASTER_DEPLOYMENT";
export const EXCEL_SYNC_INVENTORY_NSPL_CATEGORY = "EXCEL_SYNC_INVENTORY_NSPL";
export const EXCEL_SYNC_EXECUTION_CATEGORY = "EXCEL_SYNC_EXECUTION";
export const EXCEL_SYNC_EXECUTION_KEY_PREFIX = "sync-execution:";
export const EXCEL_SYNC_STATUS_KEY = "sync-status:current";

export const MASTER_DEPLOYMENT_COLUMN_ALIASES = {
  rider: ["rider", "rider name", "customer", "customer name"],
  phone: ["phone", "mobile", "registered mobile", "rider phone", "phone number"],
  hub: ["hub", "hub name"],
  vehicle: ["vehicle", "vehicle number", "vehicle no"],
  mvTrackNumber: ["mv track number", "mv track", "mvtracknumber", "mv track no", "mv_track_number"],
  plan: ["plan", "plan name"],
  status: ["status", "deployment status", "rental status"],
  deploymentDate: ["deployment date", "start date", "deployed on"],
  returnDate: ["return date", "end date"],
  coordinator: ["coordinator", "coordinator name"],
} as const;

export const INVENTORY_NSPL_COLUMN_ALIASES = {
  mvTrackNumber: ["mv track number", "mv track", "mvtracknumber", "mv track no", "mv_track_number"],
  model: ["model", "vehicle model"],
  modelCode: ["model code", "modelcode"],
  vehicleStatus: ["vehicle status", "status"],
  hub: ["hub", "hub name"],
  batteryNumber: ["battery number", "battery no"],
  iotDevice: ["iot device", "iot", "imei"],
  vin: ["vin"],
  motorNumber: ["motor number", "motor no"],
  chassisNumber: ["chassis number", "chassis no"],
} as const;
