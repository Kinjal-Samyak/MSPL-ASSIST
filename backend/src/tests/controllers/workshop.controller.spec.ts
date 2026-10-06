import type { NextFunction, Request, Response } from "express";
import { WorkshopController } from "../../controllers/workshop.controller";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("WorkshopController", () => {
  it("should_return_dashboard_response", async () => {
    const service = {
      getDashboard: jest.fn().mockResolvedValue({
        totalJobs: 5,
        openJobs: 1,
        assignedJobs: 1,
        inProgressJobs: 1,
        completedJobs: 1,
        cancelledJobs: 1,
      }),
    } as any;
    const controller = new WorkshopController(service);
    const req = {} as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDashboard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should_call_next_on_error", async () => {
    const error = new Error("fail");
    const service = {
      getJobs: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new WorkshopController(service);
    const req = { query: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getJobs(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
