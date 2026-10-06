import { ApplicationError } from "../../errors";
import { CustomerService } from "../../services/customer.service";
import { logger } from "../../utils/logger";

describe("CustomerService", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_return_customer_when_repository_finds_match", async () => {
    const repository = {
      findCustomerByRegisteredMobile: jest
        .fn()
        .mockResolvedValue({ id: "cust-1", name: "Rider One", registeredMobile: "9999988877" }),
    } as any;
    const service = new CustomerService(repository);

    const result = await service.findByRegisteredMobile("9999988877");

    expect(result?.id).toBe("cust-1");
    expect(repository.findCustomerByRegisteredMobile).toHaveBeenCalledWith("9999988877");
  });

  it("should_throw_application_error_when_mobile_is_invalid", async () => {
    const service = new CustomerService({ findCustomerByRegisteredMobile: jest.fn() } as any);

    await expect(service.findByRegisteredMobile("")).rejects.toThrow(ApplicationError);
  });

  it("should_wrap_repository_error_as_application_error", async () => {
    const repository = {
      findCustomerByRegisteredMobile: jest.fn().mockRejectedValue(new Error("db down")),
    } as any;
    const service = new CustomerService(repository);

    await expect(service.findByRegisteredMobile("9999988877")).rejects.toThrow(
      "Customer lookup failed"
    );
  });
});
