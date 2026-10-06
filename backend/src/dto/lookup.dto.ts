export interface CustomerSearchQueryDto {
  page: number;
  pageSize: number;
  search?: string;
}

export interface CustomerSearchItemDto {
  customerId: string;
  customerName: string;
  mobileNumber: string;
  hub: string | null;
  activeDeploymentCount: number;
}

export interface CustomerSearchResponseDto {
  items: CustomerSearchItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerVehicleDto {
  vehicleNumber: string;
  vehicleModel: string;
  batteryNumber: string;
  hub: string;
  deploymentDate: string;
  rentalStatus: string;
}

export interface TechnicianLookupQueryDto {
  hub?: string;
  availability?: "AVAILABLE" | "BUSY";
}

export interface ServiceTlLookupDto {
  id: string;
  name: string;
}

export interface TechnicianLookupDto {
  technicianId: string;
  technicianName: string;
  mobileNumber: string;
  workshop: string | null;
  hub: string | null;
  availabilityStatus: "AVAILABLE" | "BUSY";
  currentActiveTickets: number;
}

export interface IssueSubcategoryQueryDto {
  issueCategoryId?: string;
}

export interface IssueSubcategoryLookupDto {
  issueCategoryId: string;
  issueCategoryName: string;
  group: string;
  subcategories: string[];
}
