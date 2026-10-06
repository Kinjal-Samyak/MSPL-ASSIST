import { NotFoundError } from "../errors";
import { prismaClient } from "../database";
import type {
  CustomerSearchResponseDto,
  CustomerVehicleDto,
  IssueSubcategoryLookupDto,
  ServiceTlLookupDto,
  TechnicianLookupDto,
} from "../dto/lookup.dto";
import { LookupRepository } from "../repositories/lookup.repository";
import {
  assertCustomerExists,
  validateCustomerIdParam,
  validateCustomerSearchQuery,
  validateIssueSubcategoryQuery,
  validateTechnicianLookupQuery,
} from "../validators/lookup.validator";
import { LookupMapper } from "./lookup.mapper";

export class LookupService {
  private readonly repository: LookupRepository;

  constructor(repository?: LookupRepository) {
    this.repository = repository ?? new LookupRepository(prismaClient);
  }

  async searchCustomers(input: unknown): Promise<CustomerSearchResponseDto> {
    const query = validateCustomerSearchQuery(input);
    const { items, totalRecords } = await this.repository.searchCustomers(query);

    return LookupMapper.toCustomerSearchResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getCustomerVehicles(customerIdInput: unknown): Promise<CustomerVehicleDto[]> {
    const customerId = validateCustomerIdParam(customerIdInput);
    const customer = await this.repository.findCustomerById(customerId);
    assertCustomerExists(customer, customerId);

    const vehicles = await this.repository.findCustomerActiveVehicles(customerId);
    return LookupMapper.toCustomerVehicles(vehicles);
  }

  async getTechnicians(input: unknown): Promise<TechnicianLookupDto[]> {
    const query = validateTechnicianLookupQuery(input);
    const technicians = await this.repository.findTechnicians(query);
    const mapped = LookupMapper.toTechnicianLookup(technicians);

    if (!query.availability) {
      return mapped;
    }

    return mapped.filter((technician) => technician.availabilityStatus === query.availability);
  }

  async getServiceTls(): Promise<ServiceTlLookupDto[]> {
    return this.repository.findServiceTls();
  }

  async getIssueSubcategories(input: unknown): Promise<IssueSubcategoryLookupDto[]> {
    const query = validateIssueSubcategoryQuery(input);
    const issueCategories = await this.repository.findIssueCategories(query.issueCategoryId);

    if (query.issueCategoryId && issueCategories.length === 0) {
      throw new NotFoundError(`Issue category with id ${query.issueCategoryId} was not found.`);
    }

    return LookupMapper.toIssueSubcategories(issueCategories);
  }
}
