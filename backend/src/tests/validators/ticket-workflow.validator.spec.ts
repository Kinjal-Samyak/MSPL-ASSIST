import { ValidationError } from "../../errors";
import {
  validateApproveAllSparePartRequestsDto,
  validateDecideSparePartRequestDto,
  validateReturnSparePartsToInventoryDto,
  validateTicketClosePaymentDto,
  validateTicketCloseDecisionDto,
} from "../../validators/ticket-workflow.validator";

describe("ticket-workflow.validator", () => {
  describe("validateTicketClosePaymentDto", () => {
    it("should_accept_a_valid_neft_payment", () => {
      expect(validateTicketClosePaymentDto({ paymentMode: "neft", utrNumber: " UTR123 ", amount: "500" })).toEqual({
        paymentMode: "NEFT",
        utrNumber: "UTR123",
        amount: 500,
      });
    });

    it("should_accept_a_valid_upi_payment", () => {
      expect(validateTicketClosePaymentDto({ paymentMode: "UPI", utrNumber: "UPI999", amount: 0 })).toEqual({
        paymentMode: "UPI",
        utrNumber: "UPI999",
        amount: 0,
      });
    });

    it("should_reject_an_invalid_payment_mode", () => {
      expect(() => validateTicketClosePaymentDto({ paymentMode: "CASH", utrNumber: "UTR1", amount: 10 })).toThrow(
        ValidationError
      );
    });

    it("should_reject_a_missing_utr_number", () => {
      expect(() => validateTicketClosePaymentDto({ paymentMode: "NEFT", utrNumber: "  ", amount: 10 })).toThrow(
        ValidationError
      );
    });

    it("should_reject_a_negative_amount", () => {
      expect(() => validateTicketClosePaymentDto({ paymentMode: "NEFT", utrNumber: "UTR1", amount: -5 })).toThrow(
        ValidationError
      );
    });

    it("should_reject_a_non_object_payload", () => {
      expect(() => validateTicketClosePaymentDto(null)).toThrow(ValidationError);
    });
  });
  describe("validateTicketCloseDecisionDto", () => {
    it("should_accept_a_yes_decision_without_remarks", () => {
      expect(validateTicketCloseDecisionDto({ decision: "YES" })).toEqual({
        decision: "YES",
        remarks: undefined,
      });
    });

    it("should_require_remarks_when_decision_is_no", () => {
      expect(() => validateTicketCloseDecisionDto({ decision: "NO" })).toThrow(ValidationError);
    });

    it("should_accept_a_no_decision_with_remarks", () => {
      expect(validateTicketCloseDecisionDto({ decision: "NO", remarks: "Rider requested delay" })).toEqual({
        decision: "NO",
        remarks: "Rider requested delay",
      });
    });

    it("should_reject_an_invalid_decision_value", () => {
      expect(() => validateTicketCloseDecisionDto({ decision: "MAYBE" })).toThrow(ValidationError);
    });
  });

  describe("validateDecideSparePartRequestDto", () => {
    it("should_accept_an_empty_payload", () => {
      expect(validateDecideSparePartRequestDto(undefined)).toEqual({ remarks: undefined, approvedQuantity: undefined });
    });

    it("should_accept_an_edited_approved_quantity", () => {
      expect(validateDecideSparePartRequestDto({ approvedQuantity: 2 })).toEqual({
        remarks: undefined,
        approvedQuantity: 2,
      });
    });

    it("should_reject_a_non_positive_approved_quantity", () => {
      expect(() => validateDecideSparePartRequestDto({ approvedQuantity: 0 })).toThrow(ValidationError);
    });

    it("should_reject_a_non_integer_approved_quantity", () => {
      expect(() => validateDecideSparePartRequestDto({ approvedQuantity: 1.5 })).toThrow(ValidationError);
    });
  });

  describe("validateApproveAllSparePartRequestsDto", () => {
    it("should_accept_an_empty_payload_meaning_approve_every_pending_request", () => {
      expect(validateApproveAllSparePartRequestsDto(undefined)).toEqual({});
    });

    it("should_accept_specific_items_with_optional_edited_quantities", () => {
      expect(
        validateApproveAllSparePartRequestsDto({
          items: [{ requestId: "request-1" }, { requestId: "request-2", approvedQuantity: 5 }],
        })
      ).toEqual({
        items: [
          { requestId: "request-1", approvedQuantity: undefined },
          { requestId: "request-2", approvedQuantity: 5 },
        ],
      });
    });

    it("should_reject_an_item_missing_a_request_id", () => {
      expect(() => validateApproveAllSparePartRequestsDto({ items: [{}] })).toThrow(ValidationError);
    });
  });

  describe("validateReturnSparePartsToInventoryDto", () => {
    it("should_accept_a_valid_return_payload", () => {
      expect(
        validateReturnSparePartsToInventoryDto({ items: [{ partId: "part-1", returnQuantity: 2 }] })
      ).toEqual({ items: [{ partId: "part-1", returnQuantity: 2 }] });
    });

    it("should_reject_an_empty_items_array", () => {
      expect(() => validateReturnSparePartsToInventoryDto({ items: [] })).toThrow(ValidationError);
    });

    it("should_reject_a_missing_return_quantity", () => {
      expect(() => validateReturnSparePartsToInventoryDto({ items: [{ partId: "part-1" }] })).toThrow(ValidationError);
    });

    it("should_reject_a_duplicate_part_in_the_same_request", () => {
      expect(() =>
        validateReturnSparePartsToInventoryDto({
          items: [
            { partId: "part-1", returnQuantity: 1 },
            { partId: "part-1", returnQuantity: 2 },
          ],
        })
      ).toThrow(ValidationError);
    });
  });
});
