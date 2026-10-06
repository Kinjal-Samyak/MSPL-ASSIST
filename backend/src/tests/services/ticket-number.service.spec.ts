import { ApplicationError } from "../../errors";
import { TicketNumberService } from "../../services/ticket-number.service";
import { logger } from "../../utils/logger";

describe("TicketNumberService", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should_generate_next_ticket_number_with_incremented_sequence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-09T00:00:00.000Z"));
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      ticket: {
        findFirst: jest.fn().mockResolvedValue({ ticketNumber: "MV-090726-009" }),
      },
    } as any;
    const service = new TicketNumberService({} as any);

    const result = await service.generateNextTicketNumber(tx);

    expect(result.ticketNumber).toBe("MV-090726-010");
    expect(result.sequence).toBe(10);
  });

  it("should_throw_application_error_when_sequence_overflows", () => {
    expect(() => TicketNumberService.calculateNextSequence("MV-090726-999", "MV-090726")).toThrow(
      ApplicationError
    );
  });

  it("should_parse_sequence_from_ticket_number", () => {
    expect(TicketNumberService.parseSequenceFromTicketNumber("MV-090726-001", "MV-090726")).toBe(1);
    expect(TicketNumberService.parseSequenceFromTicketNumber("INV-001", "MV-090726")).toBeNull();
  });
});
