import type { NextFunction, Request, Response } from "express";
import { OperationalDataController } from "../../controllers/operational-data.controller";

describe("OperationalDataController", () => {
  it("should_return_settings", async () => {
    const service = {
      getSettings: jest.fn().mockResolvedValue({
        operationalDataFolder: "C:\\data",
        masterDeploymentFile: "master.xlsx",
        inventoryFile: "inventory.xlsx",
      }),
    } as any;
    const controller = new OperationalDataController(service);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.getSettings({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ operationalDataFolder: "C:\\data" }),
    });
  });

  it("should_call_next_on_errors", async () => {
    const expectedError = new Error("failed");
    const service = {
      validateConfiguration: jest.fn().mockRejectedValue(expectedError),
    } as any;
    const controller = new OperationalDataController(service);
    const next = jest.fn() as NextFunction;

    await controller.validateSettings({ body: {} } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expectedError);
  });

  it("should_redirect_to_success_on_graph_callback_success", async () => {
    const service = {
      processGraphAuthorizationCallback: jest.fn().mockResolvedValue(undefined),
    } as any;
    const controller = new OperationalDataController(service);
    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    await controller.handleGraphAuthorizationCallback(
      ({ query: { code: "auth-code" } } as unknown) as Request,
      res
    );

    expect(service.processGraphAuthorizationCallback).toHaveBeenCalledWith({ code: "auth-code" });
    expect(res.redirect).toHaveBeenCalledWith(302, "http://localhost:5173/settings?graphAuth=success");
  });

  it("should_redirect_to_failed_on_graph_callback_failure", async () => {
    const service = {
      processGraphAuthorizationCallback: jest.fn().mockRejectedValue(new Error("exchange failed")),
    } as any;
    const controller = new OperationalDataController(service);
    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    await controller.handleGraphAuthorizationCallback(
      ({ query: { code: "bad-code" } } as unknown) as Request,
      res
    );

    expect(res.redirect).toHaveBeenCalledWith(302, "http://localhost:5173/settings?graphAuth=failed");
  });

  it("should_return_onedrive_drives", async () => {
    const service = {
      listOneDriveDrives: jest.fn().mockResolvedValue([
        { id: "drive-1", name: "OneDrive", driveType: "business", webUrl: null },
      ]),
    } as any;
    const controller = new OperationalDataController(service);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.listOneDriveDrives({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: "drive-1", name: "OneDrive", driveType: "business", webUrl: null }],
    });
  });

  it("should_return_onedrive_items", async () => {
    const service = {
      browseOneDriveItems: jest.fn().mockResolvedValue({
        driveId: "drive-1",
        parentItemId: null,
        items: [],
      }),
    } as any;
    const controller = new OperationalDataController(service);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await controller.browseOneDriveItems(
      ({ query: { driveId: "drive-1" } } as unknown) as Request,
      res,
      next
    );

    expect(service.browseOneDriveItems).toHaveBeenCalledWith({ driveId: "drive-1" });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
