import { NotFoundError, UnprocessableEntityError } from "../errors";
import { prismaClient } from "../database";
import {
  validateDeploymentIdParam,
  validateDeploymentListQuery,
  validateDeploymentQuery,
} from "../validators/deployment-module.validator";
import type {
  DeploymentDashboardDto,
  DeploymentDetailDto,
  DeploymentHistoryResponseDto,
  DeploymentListQueryDto,
  DeploymentListResponseDto,
  DeploymentMutationResponseDto,
  DeploymentOperationalRecordDto,
  DeploymentPaymentsResponseDto,
  DeploymentStatusDto,
  DeploymentTimelineResponseDto,
} from "../dto/deployment-module.dto";
import { DeploymentModuleRepository } from "../repositories/deployment-module.repository";
import type { OperationalProvidersRegistry } from "./operational-providers";
import { OperationalProviders } from "./operational-providers";
import { DeploymentModuleMapper } from "./deployment-module.mapper";

export class DeploymentModuleService {
  private readonly repository: DeploymentModuleRepository;

  constructor(
    private readonly providers: OperationalProvidersRegistry = OperationalProviders,
    repository?: DeploymentModuleRepository
  ) {
    this.repository = repository ?? new DeploymentModuleRepository(prismaClient);
  }

  async getDashboard(input: unknown): Promise<DeploymentDashboardDto> {
    const query = validateDeploymentListQuery(input);
    const records = await this.getFilteredDeployments(query);
    const deploymentsWithOpenTickets = await this.countDeploymentsWithOpenTickets(records);
    return DeploymentModuleMapper.toDashboard(records, deploymentsWithOpenTickets);
  }

  async getDeployments(input: unknown): Promise<DeploymentListResponseDto> {
    const query = validateDeploymentListQuery(input);
    const filtered = await this.getFilteredDeployments(query);
    const sorted = this.sortDeployments(filtered, query.sortBy, query.sortOrder);
    const totalRecords = sorted.length;
    const start = (query.page - 1) * query.pageSize;
    const paged = sorted.slice(start, start + query.pageSize);

    const items = await Promise.all(
      paged.map(async (item) => {
        const vehicle = await this.providers.inventoryProvider.getVehicleDetails(item.mvTrackNumber);
        return DeploymentModuleMapper.toListItem(item, vehicle?.status ?? null);
      })
    );

    return DeploymentModuleMapper.toListResponse(items, totalRecords, query.page, query.pageSize);
  }

  async searchDeployments(input: unknown): Promise<DeploymentListResponseDto> {
    return this.getDeployments(input);
  }

  async getDeploymentById(deploymentIdInput: unknown): Promise<DeploymentDetailDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    const deployment = await this.findOperationalDeploymentById(deploymentId);
    if (!deployment) {
      throw new NotFoundError(`Deployment with id ${deploymentId} was not found.`);
    }

    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(deployment.mvTrackNumber);
    const listItem = DeploymentModuleMapper.toListItem(deployment, vehicle?.status ?? null);
    const openTicketCount = await this.repository.countOpenTickets(deploymentId);
    return DeploymentModuleMapper.toDetail(
      listItem,
      openTicketCount,
      vehicle?.vin ?? null,
      vehicle?.registrationNumber ?? null,
      vehicle?.batteryNumber ?? null
    );
  }

  async getTimeline(deploymentIdInput: unknown, input: unknown): Promise<DeploymentTimelineResponseDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    await this.ensureDeploymentExists(deploymentId);
    const query = validateDeploymentQuery(input);
    const { items, totalRecords } = await this.repository.findTimeline(deploymentId, query.page, query.pageSize);
    return DeploymentModuleMapper.toTimelineResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getPayments(deploymentIdInput: unknown, input: unknown): Promise<DeploymentPaymentsResponseDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    await this.ensureDeploymentExists(deploymentId);
    const query = validateDeploymentQuery(input);
    const { items, totalRecords } = await this.repository.findPayments(deploymentId, query.page, query.pageSize);
    return DeploymentModuleMapper.toPaymentsResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getHistory(deploymentIdInput: unknown, input: unknown): Promise<DeploymentHistoryResponseDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    await this.ensureDeploymentExists(deploymentId);
    const query = validateDeploymentQuery(input);
    const { items, totalRecords } = await this.repository.findHistory(deploymentId, query.page, query.pageSize);
    return DeploymentModuleMapper.toHistoryResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getStatus(deploymentIdInput: unknown): Promise<DeploymentStatusDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    const deployment = await this.findOperationalDeploymentById(deploymentId);
    if (!deployment) {
      throw new NotFoundError(`Deployment with id ${deploymentId} was not found.`);
    }

    const [latestTicketStatus, openTicketCount, workflowStatuses] = await Promise.all([
      this.repository.findLatestTicketStatus(deploymentId),
      this.repository.countOpenTickets(deploymentId),
      this.providers.lookupProvider.getWorkshopStatuses(),
    ]);

    return DeploymentModuleMapper.toStatus(
      deploymentId,
      deployment.rentalStatus,
      latestTicketStatus,
      openTicketCount,
      workflowStatuses
    );
  }

  async closeDeployment(deploymentIdInput: unknown): Promise<DeploymentMutationResponseDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    const deployment = await this.findOperationalDeploymentById(deploymentId);
    if (!deployment) {
      throw new NotFoundError(`Deployment with id ${deploymentId} was not found.`);
    }

    const openTicketCount = await this.repository.countOpenTickets(deploymentId);
    if (openTicketCount > 0) {
      throw new UnprocessableEntityError("Deployment cannot be closed while open tickets exist.");
    }

    return DeploymentModuleMapper.toMutationResponse(
      deployment.deploymentId,
      deployment.rentalStatus,
      deployment.updatedAt
    );
  }

  async reopenDeployment(deploymentIdInput: unknown): Promise<DeploymentMutationResponseDto> {
    const deploymentId = validateDeploymentIdParam(deploymentIdInput);
    const deployment = await this.findOperationalDeploymentById(deploymentId);
    if (!deployment) {
      throw new NotFoundError(`Deployment with id ${deploymentId} was not found.`);
    }

    if (deployment.rentalStatus !== "COMPLETED") {
      throw new UnprocessableEntityError("Only completed deployments can be reopened.");
    }

    return DeploymentModuleMapper.toMutationResponse(
      deployment.deploymentId,
      deployment.rentalStatus,
      deployment.updatedAt
    );
  }

  private async ensureDeploymentExists(deploymentId: string): Promise<void> {
    const deployment = await this.repository.findDeploymentMetadataById(deploymentId);
    if (!deployment) {
      throw new NotFoundError(`Deployment with id ${deploymentId} was not found.`);
    }
  }

  private async findOperationalDeploymentById(deploymentId: string): Promise<DeploymentOperationalRecordDto | null> {
    const metadata = await this.repository.findDeploymentMetadataById(deploymentId);
    if (!metadata) {
      return null;
    }

    const history = await this.providers.deploymentProvider.getDeploymentHistory(metadata.customerId);
    const providerDeployment = history.find((item) => item.deploymentId === deploymentId);
    if (!providerDeployment) {
      return null;
    }

    return {
      deploymentId: providerDeployment.deploymentId,
      customerId: metadata.customerId,
      customerName: metadata.customerName,
      customerPhone: metadata.customerPhone,
      vehicleNumber: providerDeployment.vehicleNumber,
      mvTrackNumber: providerDeployment.mvTrackNumber,
      modelName: providerDeployment.modelName,
      modelCode: metadata.modelCode,
      hubName: providerDeployment.hubName,
      rentalStatus: providerDeployment.rentalStatus,
      startedAt: providerDeployment.startedAt,
      updatedAt: providerDeployment.updatedAt,
    };
  }

  private async getOperationalDeployments(): Promise<DeploymentOperationalRecordDto[]> {
    const metadataRows = await this.repository.listDeploymentMetadata();
    const byCustomer = new Map<string, typeof metadataRows>();

    for (const row of metadataRows) {
      const items = byCustomer.get(row.customerId) ?? [];
      items.push(row);
      byCustomer.set(row.customerId, items);
    }

    const deployments: DeploymentOperationalRecordDto[] = [];
    for (const [customerId, rows] of byCustomer.entries()) {
      const history = await this.providers.deploymentProvider.getDeploymentHistory(customerId);
      const rowByDeploymentId = new Map(rows.map((item) => [item.deploymentId, item]));

      for (const item of history) {
        const metadata = rowByDeploymentId.get(item.deploymentId);
        if (!metadata) {
          continue;
        }
        deployments.push({
          deploymentId: item.deploymentId,
          customerId: metadata.customerId,
          customerName: metadata.customerName,
          customerPhone: metadata.customerPhone,
          vehicleNumber: item.vehicleNumber,
          mvTrackNumber: item.mvTrackNumber,
          modelName: item.modelName,
          modelCode: metadata.modelCode,
          hubName: item.hubName,
          rentalStatus: item.rentalStatus,
          startedAt: item.startedAt,
          updatedAt: item.updatedAt,
        });
      }
    }

    return deployments;
  }

  private async getFilteredDeployments(query: DeploymentListQueryDto): Promise<DeploymentOperationalRecordDto[]> {
    const deployments = await this.getOperationalDeployments();
    const search = query.search?.toLowerCase();
    const hubName = query.hubName?.toLowerCase();
    const modelCode = query.modelCode?.toLowerCase();

    return deployments.filter((item) => {
      if (query.rentalStatus && item.rentalStatus !== query.rentalStatus) {
        return false;
      }
      if (hubName && item.hubName.toLowerCase().indexOf(hubName) === -1) {
        return false;
      }
      if (modelCode && (item.modelCode ?? "").toLowerCase().indexOf(modelCode) === -1) {
        return false;
      }
      if (!search) {
        return true;
      }

      return [
        item.deploymentId,
        item.customerName,
        item.customerPhone,
        item.vehicleNumber,
        item.mvTrackNumber,
        item.modelName,
        item.hubName,
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private sortDeployments(
    deployments: DeploymentOperationalRecordDto[],
    sortBy: DeploymentListQueryDto["sortBy"],
    sortOrder: DeploymentListQueryDto["sortOrder"]
  ): DeploymentOperationalRecordDto[] {
    const sorted = [...deployments].sort((a, b) => {
      const left = this.sortValue(a, sortBy);
      const right = this.sortValue(b, sortBy);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
    return sortOrder === "asc" ? sorted : sorted.reverse();
  }

  private sortValue(item: DeploymentOperationalRecordDto, sortBy: DeploymentListQueryDto["sortBy"]): string {
    switch (sortBy) {
      case "startedAt":
        return item.startedAt;
      case "customerName":
        return item.customerName;
      case "vehicleNumber":
        return item.vehicleNumber;
      case "mvTrackNumber":
        return item.mvTrackNumber;
      case "rentalStatus":
        return item.rentalStatus;
      default:
        return item.updatedAt;
    }
  }

  private async countDeploymentsWithOpenTickets(deployments: DeploymentOperationalRecordDto[]): Promise<number> {
    if (deployments.length === 0) {
      return 0;
    }

    const counts = await Promise.all(
      deployments.map((item) => this.repository.countOpenTickets(item.deploymentId))
    );
    return counts.filter((count) => count > 0).length;
  }
}
