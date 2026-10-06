import type { NextFunction, Request, Response } from "express";
import { DeploymentModuleController } from "../../controllers/deployment-module.controller";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("DeploymentModuleController", () => {
  it("should_return_dashboard_response", async () => {
    const service = {
      getDashboard: jest.fn().mockResolvedValue({
        totalDeployments: 1,
        activeDeployments: 1,
        pendingDeployments: 0,
        completedDeployments: 0,
        maintenanceDeployments: 0,
        deploymentsWithOpenTickets: 0,
      }),
    } as any;
    const controller = new DeploymentModuleController(service);
    const req = { query: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDashboard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should_call_next_on_error", async () => {
    const error = new Error("fail");
    const service = {
      getDeployments: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new DeploymentModuleController(service);
    const req = { query: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDeployments(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
