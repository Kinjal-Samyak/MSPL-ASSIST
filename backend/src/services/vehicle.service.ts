import { UnprocessableEntityError } from "../errors";
import { prismaClient } from "../database";
import {
  validateVehicleDocumentQuery,
  validateVehicleIdParam,
  validateVehicleListQuery,
  validateVehicleTimelineQuery,
} from "../validators/vehicle.validator";
import type {
  VehicleDashboardDto,
  VehicleDeploymentHistoryResponseDto,
  VehicleDetailDto,
  VehicleDocumentResponseDto,
  VehicleHealthSummaryDto,
  VehicleListResponseDto,
  VehicleMutationResponseDto,
  VehicleServiceHistoryResponseDto,
  VehicleStatusSummaryDto,
  VehicleTimelineResponseDto,
} from "../dto/vehicle.dto";
import type { DeploymentDetailsDto, InventoryVehicleDetailsDto } from "../dto/operational-provider.dto";
import { VehicleRepository, type FleetOperationalSignals } from "../repositories/vehicle.repository";
import type { OperationalProvidersRegistry } from "./operational-providers";
import { OperationalProviders } from "./operational-providers";
import { VehicleMapper } from "./vehicle.mapper";

export class VehicleService {
  private readonly repository: VehicleRepository;

  constructor(
    private readonly providers: OperationalProvidersRegistry = OperationalProviders,
    repository?: VehicleRepository
  ) {
    this.repository = repository ?? new VehicleRepository(prismaClient);
  }

  async getDashboard(input: unknown): Promise<VehicleDashboardDto> {
    // Validate the request for backward compatibility, but dashboard cards
    // always describe the full inventory. List/search filters belong to the
    // vehicle table and must not rewrite every dashboard total.
    validateVehicleListQuery(input);
    const fleet = await this.getFleetInventory();
    return this.toFleetDashboard(fleet.vehicles, fleet.signals);
  }

  async getVehicles(input: unknown): Promise<VehicleListResponseDto> {
    const query = validateVehicleListQuery(input);
    const filtered = await this.getFilteredVehicles(query);
    const sorted = this.sortVehicles(filtered, query.sortBy, query.sortOrder);
    const totalRecords = sorted.length;
    const start = (query.page - 1) * query.pageSize;
    const paged = sorted.slice(start, start + query.pageSize);

    return VehicleMapper.toVehicleListResponse(
      paged.map((vehicle) => VehicleMapper.toVehicleListItem(vehicle)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async searchVehicles(input: unknown): Promise<VehicleListResponseDto> {
    return this.getVehicles(input);
  }

  async getVehicleById(vehicleIdInput: unknown): Promise<VehicleDetailDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    if (!vehicle) {
      throw new UnprocessableEntityError(`Vehicle with id ${vehicleId} was not found in Inventory.`);
    }

    return VehicleMapper.toVehicleDetail(vehicle);
  }

  async getTimeline(vehicleIdInput: unknown, input: unknown): Promise<VehicleTimelineResponseDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const query = validateVehicleTimelineQuery(input);
    const deploymentHistory = await this.providers.deploymentProvider.getDeploymentHistoryByVehicle(vehicleId);
    const deploymentIds = deploymentHistory.map((item) => item.deploymentId);
    const { items, totalRecords } = await this.repository.findVehicleTimeline(
      deploymentIds,
      query.page,
      query.pageSize
    );

    return VehicleMapper.toTimelineResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getCurrentDeployment(vehicleIdInput: unknown) {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const current = await this.providers.deploymentProvider.getCurrentDeploymentByVehicle(vehicleId);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    return VehicleMapper.toCurrentDeployment(
      current,
      vehicle?.currentCustomerName ?? null,
      vehicle?.currentCustomerPhone ?? null
    );
  }

  async getDeploymentHistory(
    vehicleIdInput: unknown,
    input: unknown
  ): Promise<VehicleDeploymentHistoryResponseDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const query = validateVehicleTimelineQuery(input);
    const history = await this.providers.deploymentProvider.getDeploymentHistoryByVehicle(vehicleId);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    const deployments = history.map((item) => ({
      ...item,
      customerName: vehicle?.currentCustomerName ?? null,
      customerPhone: vehicle?.currentCustomerPhone ?? null,
    }));
    return VehicleMapper.toDeploymentHistoryResponse(deployments, query.page, query.pageSize);
  }

  async getServiceHistory(
    vehicleIdInput: unknown,
    input: unknown
  ): Promise<VehicleServiceHistoryResponseDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const query = validateVehicleTimelineQuery(input);
    const deploymentHistory = await this.providers.deploymentProvider.getDeploymentHistoryByVehicle(vehicleId);
    const deploymentIds = deploymentHistory.map((item) => item.deploymentId);
    const { items, totalRecords } = await this.repository.findVehicleServiceHistory(
      deploymentIds,
      query.page,
      query.pageSize
    );
    return VehicleMapper.toServiceHistoryResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getStatusSummary(vehicleIdInput: unknown): Promise<VehicleStatusSummaryDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    if (!vehicle) {
      throw new UnprocessableEntityError(`Vehicle with id ${vehicleId} was not found in Inventory.`);
    }

    const currentDeployment = await this.providers.deploymentProvider.getCurrentDeploymentByVehicle(vehicleId);
    const deploymentHistory = await this.providers.deploymentProvider.getDeploymentHistoryByVehicle(vehicleId);
    const deploymentIds = deploymentHistory.map((item) => item.deploymentId);
    const openTicketCount = await this.repository.countOpenTickets(deploymentIds);
    const latestService = await this.repository.findVehicleServiceHistory(deploymentIds, 1, 1);
    const latestServiceAt = latestService.items[0]?.createdAt.toISOString() ?? null;

    return VehicleMapper.toStatusSummary(
      vehicle.mvTrackNumber,
      vehicle.status,
      Boolean(currentDeployment && currentDeployment.rentalStatus === "ACTIVE"),
      openTicketCount,
      latestServiceAt
    );
  }

  async getHealthSummary(vehicleIdInput: unknown): Promise<VehicleHealthSummaryDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    if (!vehicle) {
      throw new UnprocessableEntityError(`Vehicle with id ${vehicleId} was not found in Inventory.`);
    }
    return VehicleMapper.toHealthSummary(vehicle);
  }

  async getDocuments(vehicleIdInput: unknown, input: unknown): Promise<VehicleDocumentResponseDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const query = validateVehicleDocumentQuery(input);
    const deploymentHistory = await this.providers.deploymentProvider.getDeploymentHistoryByVehicle(vehicleId);
    const deploymentIds = deploymentHistory.map((item) => item.deploymentId);
    const { items, totalRecords } = await this.repository.findVehicleDocuments(
      deploymentIds,
      query.page,
      query.pageSize,
      query.fileType
    );
    return VehicleMapper.toDocumentResponse(items, totalRecords, query.page, query.pageSize);
  }

  async activateVehicle(vehicleIdInput: unknown): Promise<VehicleMutationResponseDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    if (!vehicle) {
      throw new UnprocessableEntityError(`Vehicle with id ${vehicleId} was not found in Inventory.`);
    }

    return VehicleMapper.toMutationResponse(vehicle);
  }

  async deactivateVehicle(vehicleIdInput: unknown): Promise<VehicleMutationResponseDto> {
    const vehicleId = validateVehicleIdParam(vehicleIdInput);
    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(vehicleId);
    if (!vehicle) {
      throw new UnprocessableEntityError(`Vehicle with id ${vehicleId} was not found in Inventory.`);
    }
    const activeDeployment = await this.providers.deploymentProvider.getCurrentDeploymentByVehicle(vehicleId);
    if (activeDeployment && activeDeployment.rentalStatus === "ACTIVE") {
      throw new UnprocessableEntityError("Vehicle cannot be deactivated while active deployment exists.");
    }

    return VehicleMapper.toMutationResponse(vehicle);
  }

  private async getFilteredVehicles(query: {
    search?: string;
    status?: string;
    hubName?: string;
    modelCode?: string;
  }): Promise<InventoryVehicleDetailsDto[]> {
    const fleet = await this.getFleetInventory();
    const vehicles = fleet.vehicles;
    const search = query.search?.toLowerCase();
    const hubName = query.hubName?.toLowerCase();
    const modelCode = query.modelCode?.toLowerCase();

    return vehicles.filter((vehicle) => {
      if (query.status && vehicle.status !== query.status) {
        return false;
      }
      if (hubName && (vehicle.hub?.hubName ?? "").toLowerCase().indexOf(hubName) === -1) {
        return false;
      }
      if (modelCode && (vehicle.modelCode ?? "").toLowerCase().indexOf(modelCode) === -1) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        vehicle.mvTrackNumber,
        vehicle.vehicleNumber,
        vehicle.vin ?? "",
        vehicle.registrationNumber ?? "",
        vehicle.modelName ?? "",
        vehicle.currentCustomerName ?? "",
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private async getFleetInventory(): Promise<{
    vehicles: InventoryVehicleDetailsDto[];
    signals: FleetOperationalSignals;
  }> {
    const repositoryWithSignals = this.repository as VehicleRepository & {
      getFleetOperationalSignals?: () => Promise<FleetOperationalSignals>;
    };
    const supportsFleetSignals = typeof repositoryWithSignals.getFleetOperationalSignals === "function";
    const emptySignals: FleetOperationalSignals = {
      activeDeploymentMvTracks: new Set(),
      downMvTracks: new Set(),
      openDowntimeStartedAtByMvTrack: new Map(),
      completedDowntimeHours: [],
      currentMonthDowntimeHours: 0,
      previouslyDeployedMvTracks: new Set(),
      downFleetBreakdown: {
        inspection: new Set(),
        waitingForSpare: new Set(),
        workInProgress: new Set(),
        readyForDeployment: new Set(),
      },
      waitingForSpare: 0,
      repairInProgress: 0,
      qualityCheck: 0,
    };
    const [inventory, signals] = await Promise.all([
      this.providers.inventoryProvider.listVehicles(),
      supportsFleetSignals
        ? repositoryWithSignals.getFleetOperationalSignals()
        : Promise.resolve(emptySignals),
    ]);
    const vehicles = inventory.map((vehicle) => ({
      ...vehicle,
      status: supportsFleetSignals
        ? this.toFleetVehicleStatus(vehicle, signals)
        : vehicle.status,
    }));
    return { vehicles, signals };
  }

  private toFleetVehicleStatus(
    vehicle: InventoryVehicleDetailsDto,
    signals: FleetOperationalSignals
  ): InventoryVehicleDetailsDto["status"] {
    const key = vehicle.mvTrackNumber.trim().toUpperCase();
    // A vehicle has one state only. Down takes precedence because it is not
    // revenue-generating even if its deployment record is still active.
    if (signals.downMvTracks.has(key)) return "WORKSHOP";
    if (signals.activeDeploymentMvTracks.has(key)) return "DEPLOYED";
    if (this.getInventoryHoldStage(vehicle, signals)) return "INACTIVE";
    return "AVAILABLE";
  }

  private getInventoryHoldStage(
    vehicle: InventoryVehicleDetailsDto,
    signals: FleetOperationalSignals
  ): "REGISTRATION_PENDING" | "INSURANCE_PENDING" | "PDI_PENDING" | null {
    const key = vehicle.mvTrackNumber.trim().toUpperCase();
    if (signals.previouslyDeployedMvTracks.has(key)) return null;
    if (!vehicle.registrationNumber) return "REGISTRATION_PENDING";
    if (!vehicle.insuranceExpiryDate) return "INSURANCE_PENDING";
    if (!vehicle.fdd) return "PDI_PENDING";
    return null;
  }

  private toFleetDashboard(
    vehicles: InventoryVehicleDetailsDto[],
    signals: FleetOperationalSignals
  ): VehicleDashboardDto {
    const totalVehicles = vehicles.length;
    const downFleet = vehicles.filter((vehicle) => vehicle.status === "WORKSHOP").length;
    const revenueFleet = vehicles.filter((vehicle) => vehicle.status === "DEPLOYED").length;
    const inventoryHold = vehicles.filter((vehicle) => vehicle.status === "INACTIVE").length;
    const readyForDeployment = totalVehicles - downFleet - revenueFleet - inventoryHold;
    const now = Date.now();
    const vehiclesAgingOver72Hours = Array.from(signals.openDowntimeStartedAtByMvTrack.values()).filter(
      (startedAt) => now - startedAt.getTime() > 72 * 3_600_000
    ).length;
    const currentDate = new Date();
    const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const averageDowntimeHours = signals.currentMonthDowntimeHours / daysInCurrentMonth;
    const fromService = vehicles.filter(
      (vehicle) => vehicle.status === "AVAILABLE" && signals.previouslyDeployedMvTracks.has(vehicle.mvTrackNumber.trim().toUpperCase())
    ).length;
    const fromInventory = readyForDeployment - fromService;
    const healthScore = this.getFleetHealthScore(totalVehicles, revenueFleet, downFleet, averageDowntimeHours, vehiclesAgingOver72Hours);
    const rounded = (value: number) => Number(value.toFixed(1));
    const inventoryHoldBreakdown = { registrationPending: 0, insurancePending: 0, pdiPending: 0 };
    for (const vehicle of vehicles) {
      const stage = this.getInventoryHoldStage(vehicle, signals);
      if (stage === "REGISTRATION_PENDING") inventoryHoldBreakdown.registrationPending += 1;
      if (stage === "INSURANCE_PENDING") inventoryHoldBreakdown.insurancePending += 1;
      if (stage === "PDI_PENDING") inventoryHoldBreakdown.pdiPending += 1;
    }

    return {
      totalVehicles,
      availableVehicles: readyForDeployment,
      deployedVehicles: revenueFleet,
      maintenanceVehicles: 0,
      workshopVehicles: downFleet,
      reservedVehicles: 0,
      inactiveVehicles: 0,
      revenueFleet,
      readyForDeployment,
      downFleet,
      inventoryHold,
      fleetUtilizationPercent: totalVehicles === 0 ? 0 : rounded((revenueFleet / totalVehicles) * 100),
      availabilityPercent: totalVehicles === 0 ? 0 : rounded(((readyForDeployment + revenueFleet) / totalVehicles) * 100),
      averageDowntimeHours: rounded(averageDowntimeHours),
      mttrHours: signals.completedDowntimeHours.length === 0 ? 0 : rounded(signals.completedDowntimeHours.reduce((sum, value) => sum + value, 0) / signals.completedDowntimeHours.length),
      vehiclesReadyToday: 0,
      waitingForSpare: signals.waitingForSpare,
      repairInProgress: signals.repairInProgress,
      qualityCheck: signals.qualityCheck,
      vehiclesAgingOver72Hours,
      readyForDeploymentBreakdown: {
        fromInventory,
        fromService,
        deployableToday: readyForDeployment,
      },
      downFleetBreakdown: {
        inspection: signals.downFleetBreakdown.inspection.size,
        waitingForSpare: signals.downFleetBreakdown.waitingForSpare.size,
        workInProgress: signals.downFleetBreakdown.workInProgress.size,
        readyForDeployment: signals.downFleetBreakdown.readyForDeployment.size,
      },
      fleetHealth: healthScore,
      inventoryHoldBreakdown,
    };
  }

  private getFleetHealthScore(
    totalFleet: number,
    revenueFleet: number,
    downFleet: number,
    averageDowntimeHours: number,
    overdueRepairs: number
  ): VehicleDashboardDto["fleetHealth"] {
    if (totalFleet === 0) return { score: 0, label: "Critical" };
    const utilizationPenalty = (1 - revenueFleet / totalFleet) * 35;
    const downPenalty = (downFleet / totalFleet) * 35;
    const downtimePenalty = Math.min(15, (averageDowntimeHours / 24) * 15);
    const overduePenalty = Math.min(15, (overdueRepairs / totalFleet) * 30);
    const score = Math.max(0, Math.round(100 - utilizationPenalty - downPenalty - downtimePenalty - overduePenalty));
    return {
      score,
      label: score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Attention" : "Critical",
    };
  }

  private sortVehicles(
    vehicles: InventoryVehicleDetailsDto[],
    sortBy: "updatedAt" | "vehicleNumber" | "mvTrackNumber" | "status" | "hubName",
    sortOrder: "asc" | "desc"
  ): InventoryVehicleDetailsDto[] {
    const sorted = [...vehicles].sort((a, b) => {
      const left = this.sortValue(a, sortBy);
      const right = this.sortValue(b, sortBy);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
    return sortOrder === "asc" ? sorted : sorted.reverse();
  }

  private sortValue(
    vehicle: InventoryVehicleDetailsDto,
    sortBy: "updatedAt" | "vehicleNumber" | "mvTrackNumber" | "status" | "hubName"
  ): string {
    switch (sortBy) {
      case "vehicleNumber":
        return vehicle.vehicleNumber;
      case "mvTrackNumber":
        return vehicle.mvTrackNumber;
      case "status":
        return vehicle.status;
      case "hubName":
        return vehicle.hub?.hubName ?? "";
      default:
        return vehicle.updatedAt;
    }
  }
}

