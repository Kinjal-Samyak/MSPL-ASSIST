import type { PartsChargingPolicy } from "@mspl/shared-constants";

/** Stable Parts boundary for future Workshop, mobile, and procurement consumers. */
export interface IPartsCatalogService {
  searchParts(input: { search?: string; modelCode?: string }): Promise<unknown[]>;
  getPartDetails(partId: string): Promise<unknown>;
  getCostSnapshot(partId: string): Promise<{ partId: string; partCode: string; partCost: string }>;
}

export interface IPartsInventoryService {
  checkHubInventory(input: { partId: string; hubId: string }): Promise<unknown>;
  getInventoryAvailability(input: { partId: string; hubId: string }): Promise<unknown>;
}

export interface IPartsReservationService {
  reserveParts(input: { jobCardReference: string; partId: string; hubId: string; quantity: number; chargingPolicy: PartsChargingPolicy }): Promise<unknown>;
  releaseReservation(reservationId: string): Promise<unknown>;
  issueParts(reservationId: string): Promise<unknown>;
  calculateChargeableAmount(input: { partCost: string; quantity: number; chargingPolicy: PartsChargingPolicy }): Promise<{ customerPayableAmount: string }>;
}

/** Future Workshop façade: consumers depend on these capabilities, never Parts persistence. */
export interface IPartsWorkshopFacade extends IPartsCatalogService, IPartsInventoryService, IPartsReservationService {}
