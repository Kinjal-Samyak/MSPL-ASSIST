import type { NextFunction, Request, Response } from "express";
import { VehicleController } from "../../controllers/vehicle.controller";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("VehicleController", () => {
  it("should_return_dashboard_response", async () => {
    const service = {
      getDashboard: jest.fn().mockResolvedValue({
        totalVehicles: 10,
        availableVehicles: 5,
        deployedVehicles: 3,
        maintenanceVehicles: 1,
        workshopVehicles: 0,
        reservedVehicles: 0,
        inactiveVehicles: 1,
      }),
    } as any;
    const controller = new VehicleController(service);
    const req = { query: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDashboard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should_call_next_on_error", async () => {
    const error = new Error("fail");
    const service = {
      getVehicles: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new VehicleController(service);
    const req = { query: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getVehicles(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

