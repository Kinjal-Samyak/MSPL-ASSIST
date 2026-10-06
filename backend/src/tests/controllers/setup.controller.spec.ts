import { SetupController } from "../../controllers/setup.controller";

describe("SetupController", () => {
  it("should_return_bootstrap_response", async () => {
    const service = {
      bootstrap: jest.fn().mockResolvedValue({
        status: "SUCCESS",
        message: "System initialized successfully.",
        adminUserId: "user-1",
        initializedAt: "2026-07-13T00:00:00.000Z",
      }),
    } as any;

    const controller = new SetupController(service);
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await controller.bootstrap(
      { body: { companyName: "MSPL Assist" } } as any,
      { status, json } as any,
      jest.fn()
    );

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});

