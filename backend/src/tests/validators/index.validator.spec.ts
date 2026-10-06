import * as validators from "../../validators";

describe("Validators index exports", () => {
  it("should_export_ticket_validator_function", () => {
    expect(typeof validators.validateCreateTicketDto).toBe("function");
  });
});
