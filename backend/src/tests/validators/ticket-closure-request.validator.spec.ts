import { ValidationError } from "../../errors";
import {
  validateCreateTicketClosureRequestDto,
  validateDecideTicketClosureRequestDto,
} from "../../validators/ticket-closure-request.validator";

describe("ticket-closure-request.validator", () => {
  describe("validateCreateTicketClosureRequestDto", () => {
    it("should_accept_a_valid_cancellation_request", () => {
      expect(
        validateCreateTicketClosureRequestDto({ requestType: "CANCELLATION", reason: "Duplicate ticket raised by mistake" })
      ).toEqual({
        requestType: "CANCELLATION",
        reason: "Duplicate ticket raised by mistake",
        paymentWaived: false,
      });
    });

    it("should_reject_a_cancellation_request_without_a_reason", () => {
      expect(() => validateCreateTicketClosureRequestDto({ requestType: "CANCELLATION", reason: "  " })).toThrow(
        ValidationError
      );
    });

    it("should_accept_a_valid_early_closure_request_with_payment", () => {
      expect(
        validateCreateTicketClosureRequestDto({
          requestType: "EARLY_CLOSURE",
          reasonCategory: "VEHICLE_EXCHANGE",
          reason: "Rider is exchanging the vehicle",
          paymentMode: "upi",
          paymentUtrNumber: " UPI123 ",
          paymentAmount: "250",
        })
      ).toEqual({
        requestType: "EARLY_CLOSURE",
        reason: "Rider is exchanging the vehicle",
        reasonCategory: "VEHICLE_EXCHANGE",
        paymentWaived: false,
        paymentMode: "UPI",
        paymentUtrNumber: "UPI123",
        paymentAmount: 250,
      });
    });

    it("should_accept_a_waived_payment_early_closure_request", () => {
      expect(
        validateCreateTicketClosureRequestDto({
          requestType: "EARLY_CLOSURE",
          reasonCategory: "ACCOUNT_CLOSURE",
          reason: "Rider is closing their account",
          paymentWaived: true,
          paymentWaiveRemarks: "No charges incurred yet",
        })
      ).toEqual({
        requestType: "EARLY_CLOSURE",
        reason: "Rider is closing their account",
        reasonCategory: "ACCOUNT_CLOSURE",
        paymentWaived: true,
        paymentWaiveRemarks: "No charges incurred yet",
      });
    });

    it("should_reject_a_waived_payment_without_a_remark", () => {
      expect(() =>
        validateCreateTicketClosureRequestDto({
          requestType: "EARLY_CLOSURE",
          reasonCategory: "ACCOUNT_CLOSURE",
          reason: "Rider is closing their account",
          paymentWaived: true,
        })
      ).toThrow(ValidationError);
    });

    it("should_reject_an_early_closure_request_missing_reason_category", () => {
      expect(() =>
        validateCreateTicketClosureRequestDto({
          requestType: "EARLY_CLOSURE",
          reason: "Rider is upgrading the vehicle",
          paymentMode: "NEFT",
          paymentUtrNumber: "UTR1",
          paymentAmount: 100,
        })
      ).toThrow(ValidationError);
    });

    it("should_reject_an_early_closure_request_with_an_invalid_payment_mode", () => {
      expect(() =>
        validateCreateTicketClosureRequestDto({
          requestType: "EARLY_CLOSURE",
          reasonCategory: "VEHICLE_UPGRADE",
          reason: "Rider is upgrading the vehicle",
          paymentMode: "CASH",
          paymentUtrNumber: "UTR1",
          paymentAmount: 100,
        })
      ).toThrow(ValidationError);
    });

    it("should_reject_an_invalid_request_type", () => {
      expect(() => validateCreateTicketClosureRequestDto({ requestType: "OTHER", reason: "x" })).toThrow(
        ValidationError
      );
    });

    it("should_reject_a_non_object_payload", () => {
      expect(() => validateCreateTicketClosureRequestDto(null)).toThrow(ValidationError);
    });
  });

  describe("validateDecideTicketClosureRequestDto", () => {
    it("should_accept_an_approval_without_remarks", () => {
      expect(validateDecideTicketClosureRequestDto({ decision: "APPROVED" })).toEqual({
        decision: "APPROVED",
        remarks: undefined,
      });
    });

    it("should_require_remarks_when_rejecting", () => {
      expect(() => validateDecideTicketClosureRequestDto({ decision: "REJECTED" })).toThrow(ValidationError);
    });

    it("should_accept_a_rejection_with_remarks", () => {
      expect(validateDecideTicketClosureRequestDto({ decision: "REJECTED", remarks: "Vehicle already delivered" })).toEqual(
        {
          decision: "REJECTED",
          remarks: "Vehicle already delivered",
        }
      );
    });

    it("should_reject_an_invalid_decision_value", () => {
      expect(() => validateDecideTicketClosureRequestDto({ decision: "MAYBE" })).toThrow(ValidationError);
    });
  });
});
