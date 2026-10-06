import { NotFoundError } from "../../errors";
import { LookupService } from "../../services/lookup.service";

describe("LookupService", () => {
  it("should_return_paginated_customer_search_results", async () => {
    const repository = {
      searchCustomers: jest.fn().mockResolvedValue({
        items: [
          {
            id: "cust-1",
            name: "Rider One",
            registeredMobile: "9876543210",
            deployments: [{ hub: { name: "Kolkata Hub" } }],
          },
        ],
        totalRecords: 1,
      }),
      findCustomerById: jest.fn(),
      findCustomerActiveVehicles: jest.fn(),
      findTechnicians: jest.fn(),
      findIssueCategories: jest.fn(),
    } as any;

    const service = new LookupService(repository);
    const result = await service.searchCustomers({ page: "1", pageSize: "10", search: "rider" });

    expect(repository.searchCustomers).toHaveBeenCalledTimes(1);
    expect(result.items[0]).toMatchObject({
      customerId: "cust-1",
      customerName: "Rider One",
      hub: "Kolkata Hub",
      activeDeploymentCount: 1,
    });
  });

  it("should_throw_not_found_when_customer_vehicles_requested_for_unknown_customer", async () => {
    const repository = {
      searchCustomers: jest.fn(),
      findCustomerById: jest.fn().mockResolvedValue(null),
      findCustomerActiveVehicles: jest.fn(),
      findTechnicians: jest.fn(),
      findIssueCategories: jest.fn(),
    } as any;

    const service = new LookupService(repository);

    await expect(service.getCustomerVehicles("cust-unknown")).rejects.toThrow(NotFoundError);
  });

  it("should_filter_technicians_by_availability", async () => {
    const repository = {
      searchCustomers: jest.fn(),
      findCustomerById: jest.fn(),
      findCustomerActiveVehicles: jest.fn(),
      findTechnicians: jest.fn().mockResolvedValue([
        {
          id: "tech-1",
          name: "Tech One",
          mobile: "9999999999",
          tickets: [{ deployment: { hub: { name: "Hub A" } } }],
        },
        {
          id: "tech-2",
          name: "Tech Two",
          mobile: "8888888888",
          tickets: [],
        },
      ]),
      findIssueCategories: jest.fn(),
    } as any;

    const service = new LookupService(repository);
    const result = await service.getTechnicians({ availability: "AVAILABLE" });

    expect(result).toHaveLength(1);
    expect(result[0].technicianId).toBe("tech-2");
  });
});
