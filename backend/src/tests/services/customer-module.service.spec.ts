import { ConflictError, NotFoundError, UnprocessableEntityError } from "../../errors";
import { CustomerModuleService } from "../../services/customer-module.service";

describe("CustomerModuleService", () => {
  it("should_return_customer_list", async () => {
    const repository = {
      findCustomers: jest.fn().mockResolvedValue({
        items: [
          {
            id: "cust-1",
            name: "Rider One",
            registeredMobile: "9876543210",
            alternateMobile: null,
            whatsAppNumber: null,
            email: null,
            status: "ACTIVE",
            createdAt: new Date("2026-07-10T09:00:00.000Z"),
            updatedAt: new Date("2026-07-10T09:00:00.000Z"),
            deployments: [{ id: "dep-1" }],
            tickets: [{ id: "t-1" }],
          },
        ],
        totalRecords: 1,
      }),
    } as any;

    const service = new CustomerModuleService(repository);
    const result = await service.getCustomers({ page: "1", pageSize: "10" });

    expect(repository.findCustomers).toHaveBeenCalledTimes(1);
    expect(result.items[0]).toMatchObject({
      customerId: "cust-1",
      customerName: "Rider One",
      activeDeploymentCount: 1,
      openTicketCount: 1,
    });
  });

  it("should_throw_conflict_on_duplicate_mobile_create", async () => {
    const repository = {
      findCustomerByMobile: jest.fn().mockResolvedValue({ id: "existing-customer" }),
    } as any;

    const service = new CustomerModuleService(repository);
    await expect(
      service.createCustomer({
        customerName: "Rider One",
        registeredMobile: "9876543210",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("should_throw_not_found_for_unknown_customer", async () => {
    const repository = {
      findCustomerById: jest.fn().mockResolvedValue(null),
    } as any;

    const service = new CustomerModuleService(repository);
    await expect(service.getCustomerById("unknown")).rejects.toThrow(NotFoundError);
  });

  it("should_block_deactivate_when_active_deployment_exists", async () => {
    const repository = {
      findCustomerById: jest.fn().mockResolvedValue({
        id: "cust-1",
        name: "Rider One",
        registeredMobile: "9876543210",
        alternateMobile: null,
        whatsAppNumber: null,
        email: null,
        address: null,
        status: "ACTIVE",
        createdAt: new Date("2026-07-10T09:00:00.000Z"),
        updatedAt: new Date("2026-07-10T09:00:00.000Z"),
        deployments: [],
        tickets: [],
      }),
      findActiveDeploymentForCustomer: jest.fn().mockResolvedValue({ id: "dep-1" }),
      findOpenTicketForCustomer: jest.fn().mockResolvedValue(null),
    } as any;

    const service = new CustomerModuleService(repository);
    await expect(service.deactivateCustomer("cust-1", { reason: "Requested" })).rejects.toThrow(
      UnprocessableEntityError
    );
  });
});
