import type { NextFunction, Request, Response } from "express";
import { NotificationController } from "../../controllers/notification.controller";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("NotificationController", () => {
  it("should_return_dashboard_response", async () => {
    const service = {
      getDashboard: jest.fn().mockResolvedValue({
        totalNotifications: 1,
        pendingNotifications: 0,
        sentNotifications: 1,
        failedNotifications: 0,
        unreadNotifications: 1,
        archivedNotifications: 0,
        totalTemplates: 1,
        activeChannels: 4,
      }),
    } as any;
    const controller = new NotificationController(service);
    const req = {} as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getDashboard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should_call_next_on_error", async () => {
    const error = new Error("failed");
    const service = {
      getNotifications: jest.fn().mockRejectedValue(error),
    } as any;
    const controller = new NotificationController(service);
    const req = { query: {} } as any as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await controller.getNotifications(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
