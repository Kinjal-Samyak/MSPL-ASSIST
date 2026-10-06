-- Additive: closes the parts requisition when the job card reaches RFD.
ALTER TABLE "JobCard" ADD COLUMN "partsRequisitionClosedAt" TIMESTAMP(3);
