import { ValidationError } from "../errors";
import type { CreateTicketClosureRequestDto, DecideTicketClosureRequestDto } from "../dto/ticket-closure-request.dto";

const REQUEST_TYPES = ["CANCELLATION", "EARLY_CLOSURE"] as const;
const REASON_CATEGORIES = ["ACCOUNT_CLOSURE", "VEHICLE_EXCHANGE", "VEHICLE_UPGRADE", "OTHER"] as const;
const PAYMENT_MODES = ["NEFT", "UPI"] as const;

export function validateCreateTicketClosureRequestDto(input: unknown): CreateTicketClosureRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Closure request payload must be an object.");
  }
  const payload = input as Record<string, unknown>;

  const requestType = payload.requestType;
  if (typeof requestType !== "string" || !REQUEST_TYPES.includes(requestType as (typeof REQUEST_TYPES)[number])) {
    throw new ValidationError("requestType must be either CANCELLATION or EARLY_CLOSURE.");
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (!reason) {
    throw new ValidationError("A reason is required.");
  }

  if (requestType === "CANCELLATION") {
    return { requestType: "CANCELLATION", reason, paymentWaived: false };
  }

  const reasonCategory = payload.reasonCategory;
  if (typeof reasonCategory !== "string" || !REASON_CATEGORIES.includes(reasonCategory as (typeof REASON_CATEGORIES)[number])) {
    throw new ValidationError(
      "reasonCategory is required for an early closure request (Account Closure / Vehicle Exchange / Vehicle Upgrade / Other)."
    );
  }
  const normalizedReasonCategory = reasonCategory as (typeof REASON_CATEGORIES)[number];

  const paymentWaived = payload.paymentWaived === true;
  if (paymentWaived) {
    const paymentWaiveRemarks = typeof payload.paymentWaiveRemarks === "string" ? payload.paymentWaiveRemarks.trim() : "";
    if (!paymentWaiveRemarks) {
      throw new ValidationError("A remark is required to waive payment capture.");
    }
    return {
      requestType: "EARLY_CLOSURE",
      reason,
      reasonCategory: normalizedReasonCategory,
      paymentWaived: true,
      paymentWaiveRemarks,
    };
  }

  const paymentMode = String(payload.paymentMode ?? "").trim().toUpperCase();
  if (!PAYMENT_MODES.includes(paymentMode as (typeof PAYMENT_MODES)[number])) {
    throw new ValidationError("Payment mode must be NEFT or UPI (or waive payment with a remark).");
  }
  const paymentUtrNumber = typeof payload.paymentUtrNumber === "string" ? payload.paymentUtrNumber.trim() : "";
  if (!paymentUtrNumber) {
    throw new ValidationError("UTR number is required (or waive payment with a remark).");
  }
  const paymentAmount = Number(payload.paymentAmount);
  if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
    throw new ValidationError("A valid payment amount is required (or waive payment with a remark).");
  }

  return {
    requestType: "EARLY_CLOSURE",
    reason,
    reasonCategory: normalizedReasonCategory,
    paymentWaived: false,
    paymentMode: paymentMode as "NEFT" | "UPI",
    paymentUtrNumber,
    paymentAmount,
  };
}

export function validateDecideTicketClosureRequestDto(input: unknown): DecideTicketClosureRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Decision payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  if (payload.decision !== "APPROVED" && payload.decision !== "REJECTED") {
    throw new ValidationError("decision must be either APPROVED or REJECTED.");
  }
  const remarks = typeof payload.remarks === "string" ? payload.remarks.trim() : "";
  if (payload.decision === "REJECTED" && !remarks) {
    throw new ValidationError("remarks are required when rejecting a closure request.");
  }
  return { decision: payload.decision, remarks: remarks || undefined };
}
