import type { NextFunction, Request, Response } from "express";
import { AdminController } from "../../controllers/admin.controller";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("AdminController", () => {
  it("should_return_dashboard_response", async () => {
    const service = {
      getDashboard: jest.fn().mockResolvedValue({
        totalUsers: 1,
        activeUsers: 1,
        inactiveUsers: 0,
        totalRoles: 3,
        totalPermissions: 6,
        totalHubs: 1,
        totalSettings: 3,
      }),
    } as any;
    const controller = new AdminController(service);
    const req = { header: jest.fn().mockReturnValue("ADMIN") } as any as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDashboard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should_call_next_on_error", async () => {
    const error = new Error("fail");
    const service = {
      getUsers: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new AdminController(service);
    const req = { query: {}, header: jest.fn().mockReturnValue("ADMIN") } as any as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getUsers(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
