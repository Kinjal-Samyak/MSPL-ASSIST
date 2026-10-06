import type {
  AssignedVehicleDto,
  CurrentHubDto,
  DeploymentDetailsDto,
  DeploymentSourceRecordDto,
  RiderProfileDto,
} from "../dto/operational-provider.dto";
import type { DeploymentProvider } from "../interfaces/operational-providers.interface";
import { DeploymentProviderRepository } from "../repositories/deployment-provider.repository";
import {
  validateCustomerId,
  validateMvTrackNumber,
  validateRiderName,
  validateRiderPhone,
} from "../validators/operational-provider.validator";

export class DeploymentProviderService implements DeploymentProvider {
  constructor(private readonly repository: DeploymentProviderRepository = new DeploymentProviderRepository()) {}

  async findRiderByPhone(phone: unknown): Promise<RiderProfileDto | null> {
    const normalizedPhone = validateRiderPhone(phone);
    const deployments = await this.repository.findDeploymentsByPhone(normalizedPhone);
    const selected = this.selectBestDeployment(deployments);
    if (!selected) {
      return null;
    }

    return {
      customerId: selected.customerId,
      customerName: selected.customerName,
      customerPhone: selected.customerPhone,
    };
  }

  async findRiderByName(name: unknown): Promise<RiderProfileDto | null> {
    const normalizedName = validateRiderName(name);
    const deployments = await this.repository.findDeploymentsByRiderName(normalizedName);
    const selected = this.selectBestDeployment(deployments);
    if (!selected) {
      return null;
    }

    return {
      customerId: selected.customerId,
      customerName: selected.customerName,
      customerPhone: selected.customerPhone,
    };
  }

  async getActiveDeployment(customerId: unknown): Promise<DeploymentDetailsDto | null> {
    const normalizedCustomerId = validateCustomerId(customerId);
    const deployments = await this.repository.findDeploymentsByCustomerId(normalizedCustomerId);
    const selected = this.selectBestDeployment(deployments);
    return selected ? this.toDeploymentDetails(selected) : null;
  }

  async getLatestDeployment(customerId: unknown): Promise<DeploymentDetailsDto | null> {
    const normalizedCustomerId = validateCustomerId(customerId);
    const deployments = await this.repository.findDeploymentsByCustomerId(normalizedCustomerId);
    return deployments[0] ? this.toDeploymentDetails(deployments[0]) : null;
  }

  async getDeploymentHistory(customerId: unknown): Promise<DeploymentDetailsDto[]> {
    const normalizedCustomerId = validateCustomerId(customerId);
    const deployments = await this.repository.findDeploymentsByCustomerId(normalizedCustomerId);
    return deployments.map((deployment) => this.toDeploymentDetails(deployment));
  }

  async getCurrentDeploymentByVehicle(mvTrackNumber: unknown): Promise<DeploymentDetailsDto | null> {
    const normalizedMvTrackNumber = validateMvTrackNumber(mvTrackNumber);
    const deployments = await this.repository.findDeploymentsByMvTrack(normalizedMvTrackNumber);
    const selected = this.selectBestDeployment(deployments);
    return selected ? this.toDeploymentDetails(selected) : null;
  }

  async getDeploymentHistoryByVehicle(mvTrackNumber: unknown): Promise<DeploymentDetailsDto[]> {
    const normalizedMvTrackNumber = validateMvTrackNumber(mvTrackNumber);
    const deployments = await this.repository.findDeploymentsByMvTrack(normalizedMvTrackNumber);
    return deployments.map((deployment) => this.toDeploymentDetails(deployment));
  }

  async getAssignedVehicle(customerId: unknown): Promise<AssignedVehicleDto | null> {
    const normalizedCustomerId = validateCustomerId(customerId);
    const deployments = await this.repository.findDeploymentsByCustomerId(normalizedCustomerId);
    const selected = this.selectBestDeployment(deployments);
    if (!selected) {
      return null;
    }

    return {
      vehicleNumber: selected.vehicleNumber,
      mvTrackNumber: selected.mvTrackNumber,
      modelName: selected.modelName,
    };
  }

  async getCurrentHub(customerId: unknown): Promise<CurrentHubDto | null> {
    const normalizedCustomerId = validateCustomerId(customerId);
    const deployments = await this.repository.findDeploymentsByCustomerId(normalizedCustomerId);
    const selected = this.selectBestDeployment(deployments);
    if (!selected) {
      return null;
    }

    return {
      hubId: selected.hubId,
      hubName: selected.hubName,
    };
  }

  private toDeploymentDetails(deployment: DeploymentSourceRecordDto): DeploymentDetailsDto {
    return {
      deploymentId: deployment.deploymentId,
      customerId: deployment.customerId,
      vehicleNumber: deployment.vehicleNumber,
      mvTrackNumber: deployment.mvTrackNumber,
      rentalStatus: deployment.rentalStatus,
      hubId: deployment.hubId,
      hubName: deployment.hubName,
      modelName: deployment.modelName,
      startedAt: deployment.startedAt,
      updatedAt: deployment.updatedAt,
    };
  }

  private selectBestDeployment(deployments: DeploymentSourceRecordDto[]): DeploymentSourceRecordDto | null {
    const latestActive = deployments.find((deployment) => deployment.rentalStatus === "ACTIVE");
    if (latestActive) {
      return latestActive;
    }

    return deployments[0] ?? null;
  }
}
