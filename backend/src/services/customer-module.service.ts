import { ConflictError, UnprocessableEntityError } from "../errors";
import { prismaClient } from "../database";
import {
  assertCustomerModuleExists,
  validateCreateCustomerDto,
  validateCustomerDocumentQuery,
  validateCustomerModuleIdParam,
  validateCustomerListQuery,
  validateCustomerRentalHistoryQuery,
  validateCustomerTimelineQuery,
  validateDeactivateCustomerDto,
  validateUpdateCustomerDto,
} from "../validators/customer-module.validator";
import type {
  CreateCustomerDto,
  CustomerActiveVehicleDto,
  CustomerDocumentResponseDto,
  CustomerListResponseDto,
  CustomerMutationResponseDto,
  CustomerProfileDto,
  CustomerRentalHistoryResponseDto,
  CustomerTimelineResponseDto,
  DeactivateCustomerDto,
  UpdateCustomerDto,
} from "../dto/customer-module.dto";
import { CustomerModuleRepository } from "../repositories/customer-module.repository";
import { CustomerModuleMapper } from "./customer-module.mapper";

export class CustomerModuleService {
  private readonly repository: CustomerModuleRepository;

  constructor(repository?: CustomerModuleRepository) {
    this.repository = repository ?? new CustomerModuleRepository(prismaClient);
  }

  async getCustomers(input: unknown): Promise<CustomerListResponseDto> {
    const query = validateCustomerListQuery(input);
    const { items, totalRecords, statusCounts } = await this.repository.findCustomers(query);
    const repositoryWithCurrentCounts = this.repository as CustomerModuleRepository & {
      findCurrentRiderStatusCounts?: () => Promise<typeof statusCounts>;
    };
    const dashboardStatusCounts =
      !query.search && !query.status && query.viewerRole !== "TECHNICIAN" &&
      typeof repositoryWithCurrentCounts.findCurrentRiderStatusCounts === "function"
        ? await repositoryWithCurrentCounts.findCurrentRiderStatusCounts()
        : statusCounts;
    return CustomerModuleMapper.toCustomerListResponse(
      items,
      totalRecords,
      query.page,
      query.pageSize,
      dashboardStatusCounts
    );
  }

  async getCustomerById(customerIdInput: unknown, viewerContext?: unknown): Promise<CustomerProfileDto> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    const query = validateCustomerListQuery({
      page: 1,
      pageSize: 1,
      ...(viewerContext as object),
    });
    const customer = await this.repository.findCustomerById(customerId, query.viewerRole, query.viewerUserId);
    assertCustomerModuleExists(customer, customerId);
    return CustomerModuleMapper.toCustomerProfile(customer);
  }

  async createCustomer(input: unknown): Promise<CustomerMutationResponseDto> {
    const payload = validateCreateCustomerDto(input) as CreateCustomerDto;
    const duplicate = await this.repository.findCustomerByMobile(payload.registeredMobile);
    if (duplicate) {
      throw new ConflictError("Rider with this phone number already exists.");
    }

    const created = await this.repository.createCustomer(payload);
    return CustomerModuleMapper.toMutationResponse(created.id, created.name, created.status, created.updatedAt);
  }

  async updateCustomer(customerIdInput: unknown, input: unknown): Promise<CustomerMutationResponseDto> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    const payload = validateUpdateCustomerDto(input) as UpdateCustomerDto;

    const existing = await this.repository.findCustomerById(customerId);
    assertCustomerModuleExists(existing, customerId);

    if (payload.registeredMobile) {
      const duplicate = await this.repository.findCustomerByMobile(payload.registeredMobile);
      if (duplicate && duplicate.id !== customerId) {
        throw new ConflictError("Rider with this phone number already exists.");
      }
    }

    const updated = await this.repository.updateCustomer(customerId, payload);
    return CustomerModuleMapper.toMutationResponse(updated.id, updated.name, updated.status, updated.updatedAt);
  }

  async deactivateCustomer(customerIdInput: unknown, input: unknown): Promise<CustomerMutationResponseDto> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    validateDeactivateCustomerDto(input) as DeactivateCustomerDto;

    const existing = await this.repository.findCustomerById(customerId);
    assertCustomerModuleExists(existing, customerId);

    const activeDeployment = await this.repository.findActiveDeploymentForCustomer(customerId);
    if (activeDeployment) {
      throw new UnprocessableEntityError("Rider cannot be deactivated while an active deployment exists.");
    }

    const openTicket = await this.repository.findOpenTicketForCustomer(customerId);
    if (openTicket) {
      throw new UnprocessableEntityError("Rider cannot be deactivated while an open ticket exists.");
    }

    const updated = await this.repository.updateCustomer(customerId, { status: "INACTIVE" });
    return CustomerModuleMapper.toMutationResponse(updated.id, updated.name, updated.status, updated.updatedAt);
  }

  async getCustomerTimeline(customerIdInput: unknown, input: unknown): Promise<CustomerTimelineResponseDto> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    const query = validateCustomerTimelineQuery(input);
    const customer = await this.repository.findCustomerById(customerId);
    assertCustomerModuleExists(customer, customerId);

    const { items, totalRecords } = await this.repository.findCustomerTimeline(
      customerId,
      query.page,
      query.pageSize
    );
    return CustomerModuleMapper.toTimelineResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getCustomerRentalHistory(
    customerIdInput: unknown,
    input: unknown
  ): Promise<CustomerRentalHistoryResponseDto> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    const query = validateCustomerRentalHistoryQuery(input);
    const customer = await this.repository.findCustomerById(customerId);
    assertCustomerModuleExists(customer, customerId);

    const { items, totalRecords } = await this.repository.findCustomerRentalHistory(customerId, query);
    return CustomerModuleMapper.toRentalHistoryResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getCustomerActiveVehicles(customerIdInput: unknown): Promise<CustomerActiveVehicleDto[]> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    const customer = await this.repository.findCustomerById(customerId);
    assertCustomerModuleExists(customer, customerId);

    const items = await this.repository.findCustomerActiveVehicles(customerId);
    return CustomerModuleMapper.toActiveVehicles(items);
  }

  async getCustomerDocuments(customerIdInput: unknown, input: unknown): Promise<CustomerDocumentResponseDto> {
    const customerId = validateCustomerModuleIdParam(customerIdInput);
    const query = validateCustomerDocumentQuery(input);
    const customer = await this.repository.findCustomerById(customerId);
    assertCustomerModuleExists(customer, customerId);

    const { items, totalRecords } = await this.repository.findCustomerDocuments(customerId, query);
    return CustomerModuleMapper.toDocumentResponse(items, totalRecords, query.page, query.pageSize);
  }
}
