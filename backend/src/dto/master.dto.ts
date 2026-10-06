export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface StatusDto {
  id: string;
  name: string;
  displayOrder: number;
  customerVisible: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCategoryDto {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HubDto {
  id: string;
  name: string;
  city: string;
  state: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModelDto {
  id: string;
  modelCode: string;
  displayName: string;
  manufacturer: string;
  vehicleType: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
