import type { NextFunction, Request, Response } from "express";
import { ApplicationError } from "../../errors";
import { requireRoles } from "../../middleware/auth.middleware";

describe("requireRoles", () => {
  const allowedRoles = ["ADMIN", "TECHNICIAN"] as const;

  function execute(role: "ADMIN" | "COORDINATOR" | "TECHNICIAN") {
    const request = {
      authUser: { userId: "user-1", role, email: "user@msplassist.test" },
    } as unknown as Request;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    requireRoles([...allowedRoles])(request, {} as Response, next);
    return next;
  }

  it.each(["ADMIN", "TECHNICIAN"] as const)("allows %s to access Technician APIs", (role) => {
    expect(execute(role)).toHaveBeenCalledWith();
  });

  it("denies a COORDINATOR with the standard 403 application error", () => {
    const next = execute("COORDINATOR");
    const [error] = next.mock.calls[0];

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error).toMatchObject({ statusCode: 403, message: "Access denied." });
  });
});
