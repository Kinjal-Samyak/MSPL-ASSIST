import { ApplicationError } from "../../errors";
import { SEQUENCE_LOCK_KEYS, SequenceNumberService } from "../../services/sequence-number.service";
import { logger } from "../../utils/logger";

describe("SequenceNumberService", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should_generate_first_number_of_the_day_when_none_exist_yet", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-29T00:00:00.000Z"));
    const tx = { $executeRaw: jest.fn().mockResolvedValue(undefined) } as any;
    const findLatestNumber = jest.fn().mockResolvedValue(null);

    const result = await SequenceNumberService.generateNextNumber(tx, {
      lockKey: SEQUENCE_LOCK_KEYS.PROCUREMENT_REQUEST,
      entityPrefix: "PR",
      sequenceDigits: 3,
      maxSequence: 999,
      findLatestNumber,
    });

    expect(result).toBe("PR-290726-001");
    expect(findLatestNumber).toHaveBeenCalledWith(tx, "PR-290726");
  });

  it("should_increment_sequence_from_the_latest_number_sharing_the_same_date_prefix", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-29T00:00:00.000Z"));
    const tx = { $executeRaw: jest.fn().mockResolvedValue(undefined) } as any;
    const findLatestNumber = jest.fn().mockResolvedValue("PO-290726-004");

    const result = await SequenceNumberService.generateNextNumber(tx, {
      lockKey: SEQUENCE_LOCK_KEYS.PURCHASE_ORDER,
      entityPrefix: "PO",
      sequenceDigits: 3,
      maxSequence: 999,
      findLatestNumber,
    });

    expect(result).toBe("PO-290726-005");
  });

  it("should_throw_application_error_when_sequence_overflows", () => {
    expect(() => SequenceNumberService.calculateNextSequence("GRN-290726-999", "GRN-290726", 3, 999)).toThrow(ApplicationError);
  });

  it("should_parse_sequence_from_number_and_return_null_for_a_mismatched_prefix", () => {
    expect(SequenceNumberService.parseSequenceFromNumber("PR-290726-007", "PR-290726")).toBe(7);
    expect(SequenceNumberService.parseSequenceFromNumber("PO-290726-007", "PR-290726")).toBeNull();
  });

  it("should_use_distinct_lock_keys_per_entity_so_numbering_never_contends", () => {
    const keys = Object.values(SEQUENCE_LOCK_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
