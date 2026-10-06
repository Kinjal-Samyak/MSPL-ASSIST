import type {
  CustomerSearchItemDto,
  CustomerSearchResponseDto,
  CustomerVehicleDto,
  IssueSubcategoryLookupDto,
  TechnicianLookupDto,
} from "../dto/lookup.dto";
import type {
  CustomerSearchRow,
  CustomerVehicleRow,
  IssueCategoryRow,
  TechnicianLookupRow,
} from "../repositories/lookup.repository";

const issueSubcategoryMap: Record<string, string[]> = {
  BATTERY: ["Battery Not Charging", "Low Backup", "Battery Drain", "Battery Swelling"],
  MOTOR: ["Motor Noise", "Motor Overheating", "Motor Failure", "Vibration"],
  CONTROLLER: ["Controller Not Responding", "Controller Heating", "Controller Error"],
  BRAKE: ["Brake Noise", "Brake Weak", "Brake Jammed", "Brake Adjustment"],
  TYRE: ["Tyre Puncture", "Tyre Wear", "Wheel Alignment", "Tube Leak"],
  ELECTRICAL: ["Wiring Fault", "Fuse Issue", "Headlamp Issue", "Horn Issue"],
  BODY: ["Body Damage", "Panel Replacement", "Paint Issue", "Seat Damage"],
  ACCESSORIES: ["Charger Issue", "Mirror Replacement", "Lock Issue", "Stand Issue"],
};

function resolveIssueGroup(categoryName: string): string {
  const upper = categoryName.toUpperCase();
  const knownGroup = Object.keys(issueSubcategoryMap).find((group) => upper.includes(group));
  return knownGroup ?? "ACCESSORIES";
}

export class LookupMapper {
  static toCustomerSearchResponse(
    rows: CustomerSearchRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): CustomerSearchResponseDto {
    const items: CustomerSearchItemDto[] = rows.map((row) => ({
      customerId: row.id,
      customerName: row.name,
      mobileNumber: row.registeredMobile,
      hub: row.deployments[0]?.hub.name ?? null,
      activeDeploymentCount: row.deployments.length,
    }));

    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toCustomerVehicles(rows: CustomerVehicleRow[]): CustomerVehicleDto[] {
    return rows.map((row) => ({
      vehicleNumber: row.vehicleNumber,
      vehicleModel: row.vehicleModel.displayName,
      batteryNumber: row.mvTrackNumber,
      hub: row.hub.name,
      deploymentDate: row.createdAt.toISOString(),
      rentalStatus: row.rentalStatus,
    }));
  }

  static toTechnicianLookup(rows: TechnicianLookupRow[]): TechnicianLookupDto[] {
    return rows.map((row) => {
      const currentActiveTickets = row.tickets.length;
      const hub = row.tickets[0]?.deployment?.hub?.name ?? null;

      return {
        technicianId: row.id,
        technicianName: row.name,
        mobileNumber: row.mobile,
        workshop: hub,
        hub,
        availabilityStatus: currentActiveTickets > 0 ? "BUSY" : "AVAILABLE",
        currentActiveTickets,
      };
    });
  }

  static toIssueSubcategories(rows: IssueCategoryRow[]): IssueSubcategoryLookupDto[] {
    return rows.map((row) => {
      const group = resolveIssueGroup(row.name);

      return {
        issueCategoryId: row.id,
        issueCategoryName: row.name,
        group,
        subcategories: issueSubcategoryMap[group],
      };
    });
  }
}
