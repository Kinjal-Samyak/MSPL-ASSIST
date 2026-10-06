import type { NextFunction, Request, Response } from "express";
import { ReportController } from "../../controllers/report.controller";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("ReportController", () => {
  it("should_return_dashboard_response", async () => {
    const service = {
      getDashboard: jest.fn().mockResolvedValue({
        generatedAt: "2026-07-10T00:00:00.000Z",
        reports: [],
        supportedExports: ["CSV", "EXCEL", "PDF"],
      }),
    } as any;
    const controller = new ReportController(service);
    const req = {} as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDashboard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should_call_next_on_error", async () => {
    const error = new Error("failed");
    const service = {
      getTicketReports: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new ReportController(service);
    const req = { query: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getTicketReports(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
