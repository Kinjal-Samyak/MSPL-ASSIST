export interface VehicleModelRateDto {
  id: string;
  weeklyRental: string;
  dailyRental: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
}

export interface VehicleModelWithRateDto {
  id: string;
  modelCode: string;
  displayName: string;
  manufacturer: string;
  vehicleType: string | null;
  active: boolean;
  slaTargetDays: number;
  currentRate: VehicleModelRateDto | null;
}

export interface CreateVehicleModelRateDto {
  weeklyRental: number;
  effectiveFrom: string;
}

export interface UpdateSlaTargetDto {
  slaTargetDays: number;
}
