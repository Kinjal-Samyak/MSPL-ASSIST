import { CustomerModuleController } from "../../controllers/customer-module.controller";

function createResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("CustomerModuleController", () => {
  it("should_return_customer_list_response", async () => {
    const service = {
      getCustomers: jest.fn().mockResolvedValue({
        items: [],
        totalRecords: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }),
    } as any;
    const controller = new CustomerModuleController(service);
    const req: any = { query: {} };
    const res = createResponse();
    const next = jest.fn();

    await controller.getCustomers(req, res as any, next);

    expect(service.getCustomers).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ items: [] }),
    });
  });

  it("should_delegate_errors_to_next", async () => {
    const error = new Error("failed");
    const service = {
      getCustomerById: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new CustomerModuleController(service);
    const req: any = { params: { customerId: "cust-1" }, query: {} };
    const res = createResponse();
    const next = jest.fn();

    await controller.getCustomerById(req, res as any, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
