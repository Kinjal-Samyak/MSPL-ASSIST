import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Download, Eye, FileText, Image, ReceiptText, Trash2 } from 'lucide-react';
import { Modal } from '@/components/layout';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import {
  TicketClosePaymentDialog,
  type TicketClosePaymentPayload,
} from './TicketClosePaymentDialog';
import { formatDateTime, toast } from '@/utils';
import { lookupService } from '@/services/lookupService';
import {
  ticketService,
  type JobCardDetail,
  type JobCardSparePartItem,
  type SparePartRequestItem,
} from '@/services/ticketService';
import { SparePartRequestsPanel } from './SparePartRequestsPanel';
import { JOB_CARD_STATUS_LABELS } from '@/constants/jobCardStatus';
import { commentService } from '@/services/commentService';
import { attachmentService } from '@/services/attachmentService';
import { toApiErrorMessage } from '@/services/apiService';
import { useAuthStore } from '@/store/authStore';
import type {
  Ticket,
  TicketActivityType,
  TicketAttachment,
  TicketComment,
  TicketStatus,
  TicketWorkflowStage,
} from '@/features/tickets/types/ticket.types';
import { toBackendStatus } from '@/features/tickets/types/ticket.api';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTimeline } from './TicketTimeline';

interface TicketPreviewProps {
  ticket: Ticket | null;
  onRefreshTicket?: (ticketId: string) => Promise<void>;
}

type ActionModalType = 'assign' | 'status' | 'eta' | 'charges' | 'comment' | 'attachment' | null;
type NewCommentType = 'INTERNAL' | 'TECHNICIAN' | 'CUSTOMER';

interface TechnicianOption {
  id: string;
  name: string;
  phone: string;
  workshop: string;
  availabilityStatus: 'AVAILABLE' | 'BUSY';
  currentActiveTickets: number;
}

const OPERATOR_NAME = 'Operations Coordinator';
const MOCK_ATTACHMENT_SIZE_LIMIT = 5 * 1024 * 1024;

const STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_PARTS', label: 'Waiting For Parts' },
  { value: 'READY', label: 'Ready' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const ACTIVITY_LABELS: Record<TicketActivityType, string> = {
  STATUS_CHANGED: 'Status Changed',
  ETA_UPDATED: 'ETA Updated',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  CHARGE_UPDATED: 'Charge Updated',
  COMMENT_ADDED: 'Comment Added',
  ATTACHMENT_UPLOADED: 'Attachment Uploaded',
  ATTACHMENT_DELETED: 'Attachment Deleted',
  WHATSAPP_NOTIFICATION_SENT: 'WhatsApp Notification Sent',
  SYSTEM_GENERATED_EVENT: 'System Generated Event',
};

const COMMENT_STYLE_MAP: Record<TicketComment['channel'], string> = {
  COORDINATOR: 'bg-indigo-50 dark:bg-indigo-900/20',
  TECHNICIAN: 'bg-gray-50 dark:bg-gray-800/60',
  CUSTOMER: 'bg-blue-50 dark:bg-blue-900/20',
  SYSTEM: 'bg-amber-50 dark:bg-amber-900/20',
};

const COMMENT_ROLE_MAP: Record<TicketComment['channel'], string> = {
  COORDINATOR: 'Internal Note',
  TECHNICIAN: 'Technician Note',
  CUSTOMER: 'Rider Note',
  SYSTEM: 'System Note',
};

const WORKFLOW_STAGE_LABELS: Record<TicketWorkflowStage, string> = {
  CREATED: 'Created',
  SERVICE_TL_REVIEW: 'Service Engineer Review',
  CONSULTATION_RESOLVED: 'Consultation Resolved',
  WORKSHOP_REQUIRED: 'Workshop Required',
  RFD: 'Ready for Deployment',
  REOPENED: 'Reopened',
};

function cloneTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    timelinePreview: [...ticket.timelinePreview],
    comments: [...ticket.comments],
    attachments: [...ticket.attachments],
    activityLog: [...ticket.activityLog],
    notificationHistory: [...ticket.notificationHistory],
  };
}

function toDateTimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toCurrency(value: number): string {
  return value.toLocaleString('en-IN');
}

function getSlaRemainingLabel(ticket: Ticket): string {
  if (ticket.slaState === 'BREACHED') return 'Breached';
  const etaTime = new Date(ticket.eta).getTime();
  const nowTime = Date.now();
  const remainingMs = Math.max(etaTime - nowTime, 0);
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${remainingHours}h ${remainingMinutes}m remaining`;
}

function getAttachmentIcon(fileType: TicketAttachment['fileType']) {
  if (fileType === 'IMAGE') return <Image className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  if (fileType === 'INVOICE')
    return <ReceiptText className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  return <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
}

function isSupportedAttachment(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    file.type.startsWith('image/') ||
    file.type === 'application/pdf' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  );
}

function toCommentAuthor(type: NewCommentType): string {
  if (type === 'TECHNICIAN') return 'Assigned Technician';
  if (type === 'CUSTOMER') return 'Rider Operations Desk';
  return OPERATOR_NAME;
}

function toCommentChannel(type: NewCommentType): TicketComment['channel'] {
  if (type === 'TECHNICIAN') return 'TECHNICIAN';
  if (type === 'CUSTOMER') return 'CUSTOMER';
  return 'COORDINATOR';
}

export function TicketPreview({ ticket, onRefreshTicket }: TicketPreviewProps) {
  const currentUserRole = useAuthStore((state) => state.user?.role);
  const canActOnServiceTlReview =
    currentUserRole === 'SERVICE_TL' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'SERVICE_MANAGER';
  const canActOnJobCard =
    currentUserRole === 'TECHNICIAN' ||
    currentUserRole === 'SERVICE_TL' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'SERVICE_MANAGER';

  const [workingTicket, setWorkingTicket] = useState<Ticket | null>(null);
  const [activeModal, setActiveModal] = useState<ActionModalType>(null);
  const [availableTechnicians, setAvailableTechnicians] = useState<TechnicianOption[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [nextStatus, setNextStatus] = useState<TicketStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [confirmDestructiveStatus, setConfirmDestructiveStatus] = useState(false);
  const [newEta, setNewEta] = useState('');
  const [etaReason, setEtaReason] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [validationError, setValidationError] = useState('');

  const [commentType, setCommentType] = useState<NewCommentType>('INTERNAL');
  const [commentText, setCommentText] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [communicationMessage, setCommunicationMessage] = useState('');

  const [availableServiceTls, setAvailableServiceTls] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [workflowServiceTlId, setWorkflowServiceTlId] = useState('');
  const [workflowWorkshopTechnicianId, setWorkflowWorkshopTechnicianId] = useState('');
  const [workflowActionLoading, setWorkflowActionLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState('');

  /** Service Engineer "completes Job Card" panel: Initial Observation, Root Cause, Work to be
   * Performed, Other Requirements, Spare Parts, ETA - then Save Changes hands the job
   * card to the assigned Technician. Also covers Final Verification once the Technician
   * marks the job card COMPLETED. */
  const [jobCardDetail, setJobCardDetail] = useState<JobCardDetail | null>(null);
  const [jobCardDetailLoading, setJobCardDetailLoading] = useState(false);
  const [jcInitialObservation, setJcInitialObservation] = useState('');
  const [jcRootCause, setJcRootCause] = useState('');
  const [jcOtherRequirements, setJcOtherRequirements] = useState('');
  const [jcEstimatedCompletionAt, setJcEstimatedCompletionAt] = useState('');
  const [jcSavingDetails, setJcSavingDetails] = useState(false);
  const [jcSpareParts, setJcSpareParts] = useState<JobCardSparePartItem[]>([]);
  const [jcSparePartRequests, setJcSparePartRequests] = useState<SparePartRequestItem[]>([]);
  const [jcSparePartRequestBusyId, setJcSparePartRequestBusyId] = useState<string | null>(null);
  const [jcApproveAllBusy, setJcApproveAllBusy] = useState(false);
  const [jcApprovalFailures, setJcApprovalFailures] = useState<Record<string, string>>({});
  const [jcCompletionDate, setJcCompletionDate] = useState('');
  const [jcCompletionTime, setJcCompletionTime] = useState('');
  const [jcCompletedByName, setJcCompletedByName] = useState('');
  const [showClosePaymentModal, setShowClosePaymentModal] = useState(false);

  /** Coordinator Final Action once the Ticket returns at RFD: Close Ticket or Keep Open. */
  const [showCloseTicketPrompt, setShowCloseTicketPrompt] = useState(false);
  const [closeDecisionRemarks, setCloseDecisionRemarks] = useState('');
  const [closeDecisionBusy, setCloseDecisionBusy] = useState(false);

  /** Administrator-only, irreversible hard delete. */

  useEffect(() => {
    setWorkingTicket(ticket ? cloneTicket(ticket) : null);
  }, [ticket]);

  useEffect(() => {
    let isCancelled = false;
    lookupService
      .getTechnicians()
      .then((technicians) => {
        if (isCancelled) return;
        setAvailableTechnicians(
          technicians.map((technician) => ({
            id: technician.technicianId,
            name: technician.technicianName,
            phone: technician.mobileNumber,
            workshop: technician.workshop ?? technician.hub ?? 'NA',
            availabilityStatus: technician.availabilityStatus,
            currentActiveTickets: technician.currentActiveTickets,
          }))
        );
      })
      .catch(() => {
        if (isCancelled) return;
        setAvailableTechnicians([]);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    lookupService
      .getServiceTls()
      .then((serviceTls) => {
        if (isCancelled) return;
        setAvailableServiceTls(serviceTls);
      })
      .catch(() => {
        if (isCancelled) return;
        setAvailableServiceTls([]);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (communicationMessage === '') return undefined;
    const timeout = setTimeout(() => setCommunicationMessage(''), 2500);
    return () => clearTimeout(timeout);
  }, [communicationMessage]);

  const loadJobCard = useCallback(async (ticketId: string) => {
    setJobCardDetailLoading(true);
    try {
      const [detail, sparePartRequests] = await Promise.all([
        ticketService.getJobCardDetail(ticketId),
        ticketService.listSparePartRequests(ticketId).catch(() => []),
      ]);
      setJobCardDetail(detail);
      setJcInitialObservation(detail.initialObservation ?? '');
      setJcRootCause(detail.rootCause ?? '');
      setJcOtherRequirements(detail.otherRequirements ?? '');
      setJcEstimatedCompletionAt(
        detail.estimatedCompletionAt ? toDateTimeLocalValue(detail.estimatedCompletionAt) : ''
      );
      setJcSpareParts(detail.spareParts);
      setJcCompletedByName(detail.technicianName ?? '');
      setJcSparePartRequests(sparePartRequests);
    } catch (detailError) {
      setJobCardDetail(null);
      setWorkflowError(toApiErrorMessage(detailError));
    } finally {
      setJobCardDetailLoading(false);
    }
  }, []);

  const refreshSparePartRequests = useCallback(async (ticketId: string) => {
    try {
      setJcSparePartRequests(await ticketService.listSparePartRequests(ticketId));
    } catch {
      // Non-fatal - the list simply won't refresh until the next full job card load.
    }
  }, []);

  const handleApproveSparePartRequest = async (requestId: string, approvedQuantity: number) => {
    if (!workingTicket) return;
    setJcSparePartRequestBusyId(requestId);
    try {
      await ticketService.approveSparePartRequest(requestId, approvedQuantity);
      toast.success('Spare part request approved');
      setJcApprovalFailures((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([id]) => id !== requestId))
      );
      await refreshSparePartRequests(workingTicket.id);
      await loadJobCard(workingTicket.id);
    } catch (approveError) {
      toast.error('Unable to approve request', { description: toApiErrorMessage(approveError) });
    } finally {
      setJcSparePartRequestBusyId(null);
    }
  };

  const handleApproveAllSparePartRequests = async (
    items: Array<{ requestId: string; approvedQuantity: number }>
  ) => {
    if (!workingTicket) return;
    setJcApproveAllBusy(true);
    try {
      const result = await ticketService.approveAllSparePartRequests(workingTicket.id, { items });
      if (result.failed.length === 0) {
        toast.success(`Approved ${result.approved.length} spare part request(s)`);
      } else {
        toast.error(`Approved ${result.approved.length}, ${result.failed.length} failed`, {
          description: result.failed
            .map((failure) => `${failure.partCode}: ${failure.reason}`)
            .join('; '),
        });
      }
      setJcApprovalFailures(
        Object.fromEntries(result.failed.map((failure) => [failure.requestId, failure.reason]))
      );
      await refreshSparePartRequests(workingTicket.id);
      await loadJobCard(workingTicket.id);
    } catch (approveAllError) {
      toast.error('Unable to approve requests', {
        description: toApiErrorMessage(approveAllError),
      });
    } finally {
      setJcApproveAllBusy(false);
    }
  };

  const handleRejectSparePartRequest = async (requestId: string, remarks: string) => {
    if (!workingTicket) return;
    setJcSparePartRequestBusyId(requestId);
    try {
      await ticketService.rejectSparePartRequest(requestId, remarks);
      toast.success('Spare part request rejected');
      await refreshSparePartRequests(workingTicket.id);
    } catch (rejectError) {
      toast.error('Unable to reject request', { description: toApiErrorMessage(rejectError) });
    } finally {
      setJcSparePartRequestBusyId(null);
    }
  };

  const handleReverseSparePartRequest = async (requestId: string, remarks: string) => {
    if (!workingTicket) return;
    setJcSparePartRequestBusyId(requestId);
    try {
      await ticketService.reverseSparePartRequest(requestId, remarks);
      toast.success('Spare part request reversed', { description: 'Stock has been returned.' });
      await refreshSparePartRequests(workingTicket.id);
      await loadJobCard(workingTicket.id);
    } catch (reverseError) {
      toast.error('Unable to reverse request', { description: toApiErrorMessage(reverseError) });
    } finally {
      setJcSparePartRequestBusyId(null);
    }
  };

  useEffect(() => {
    if (!workingTicket?.jobCardStage || !canActOnServiceTlReview) {
      setJobCardDetail(null);
      return;
    }
    void loadJobCard(workingTicket.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingTicket?.id, workingTicket?.jobCardStage, canActOnServiceTlReview]);

  useEffect(() => {
    if (!workingTicket) return;

    if (activeModal === 'assign') {
      setSelectedTechnician('');
      setValidationError('');
    }
    if (activeModal === 'status') {
      setNextStatus('');
      setStatusReason('');
      setConfirmDestructiveStatus(false);
      setValidationError('');
    }
    if (activeModal === 'eta') {
      setNewEta(toDateTimeLocalValue(workingTicket.eta));
      setEtaReason('');
      setValidationError('');
    }
    if (activeModal === 'charges') {
      const suggestedLabour = Math.max(Math.round(workingTicket.estimatedCharges * 0.55), 0);
      const suggestedParts = Math.max(workingTicket.estimatedCharges - suggestedLabour, 0);
      setLabourCost(String(suggestedLabour));
      setPartsCost(String(suggestedParts));
      setDiscountValue(String(workingTicket.discount));
      setTotalCost(String(workingTicket.actualCharges));
      setValidationError('');
    }
    if (activeModal === 'comment') {
      setCommentText('');
      setValidationError('');
    }
    if (activeModal === 'attachment') {
      setAttachmentFiles([]);
      setValidationError('');
    }
  }, [activeModal, workingTicket]);

  const destructiveStatusSelected = nextStatus === 'CLOSED' || nextStatus === 'CANCELLED';

  const chargesPreview = useMemo(() => {
    const labour = Number(labourCost || 0);
    const parts = Number(partsCost || 0);
    const discount = Number(discountValue || 0);
    const total = Number(totalCost || 0);
    return { labour, parts, discount, total };
  }, [labourCost, partsCost, discountValue, totalCost]);

  const sparePartsTotalCharges = useMemo(
    () =>
      jcSpareParts.reduce(
        (sum, item) => sum + Number(item.partCost || 0) * item.requiredQuantity,
        0
      ),
    [jcSpareParts]
  );

  const sortedComments = useMemo(
    () =>
      [...(workingTicket?.comments ?? [])].sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp)
      ),
    [workingTicket?.comments]
  );

  const sortedAttachments = useMemo(
    () =>
      [...(workingTicket?.attachments ?? [])].sort((left, right) =>
        right.uploadedAt.localeCompare(left.uploadedAt)
      ),
    [workingTicket?.attachments]
  );

  const sortedNotifications = useMemo(
    () =>
      [...(workingTicket?.notificationHistory ?? [])].sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp)
      ),
    [workingTicket?.notificationHistory]
  );

  if (!workingTicket) {
    return (
      <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
        <CardTitle>Ticket Preview</CardTitle>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Select a ticket row to preview rider, vehicle and timeline details.
        </p>
      </Card>
    );
  }

  const handleAssignTechnician = async () => {
    if (selectedTechnician === '') {
      setValidationError('Technician is required.');
      return;
    }
    const technician = availableTechnicians.find((option) => option.id === selectedTechnician);
    if (!technician) {
      setValidationError('Selected technician is invalid.');
      return;
    }

    if (!workingTicket) return;

    setActionLoading(true);
    setValidationError('');
    try {
      await ticketService.assignTechnician(workingTicket.id, {
        technicianId: technician.id,
      });
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage('Technician assignment updated successfully.');
      setActiveModal(null);
    } catch (error) {
      setValidationError(toApiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (nextStatus === '') {
      setValidationError('Status is required.');
      return;
    }
    if (statusReason.trim() === '') {
      setValidationError('Reason is required.');
      return;
    }
    if (destructiveStatusSelected && !confirmDestructiveStatus) {
      setValidationError('Please confirm this destructive status change.');
      return;
    }
    if (!workingTicket) return;

    setActionLoading(true);
    setValidationError('');
    try {
      await ticketService.updateStatus(workingTicket.id, {
        status: toBackendStatus(nextStatus),
        remarks: statusReason.trim(),
      });
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage('Ticket status updated successfully.');
      setActiveModal(null);
    } catch (error) {
      setValidationError(toApiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEta = async () => {
    if (newEta.trim() === '') {
      setValidationError('New ETA is required.');
      return;
    }
    if (etaReason.trim() === '') {
      setValidationError('Reason is required.');
      return;
    }
    if (!workingTicket) return;

    setActionLoading(true);
    setValidationError('');
    try {
      await ticketService.updateEta(workingTicket.id, {
        eta: new Date(newEta).toISOString(),
        reason: etaReason.trim(),
      });
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage('ETA updated successfully.');
      setActiveModal(null);
    } catch (error) {
      setValidationError(toApiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCharges = async () => {
    const labour = Number(labourCost);
    const parts = Number(partsCost);
    const discount = Number(discountValue);
    const total = Number(totalCost);

    if (
      Number.isNaN(labour) ||
      Number.isNaN(parts) ||
      Number.isNaN(discount) ||
      Number.isNaN(total) ||
      labour < 0 ||
      parts < 0 ||
      discount < 0 ||
      total < 0
    ) {
      setValidationError('Enter valid non-negative numbers for all charge fields.');
      return;
    }
    if (!workingTicket) return;

    setActionLoading(true);
    setValidationError('');
    try {
      await ticketService.updateCharges(workingTicket.id, {
        labourCharges: labour,
        partsCharges: parts,
        discount,
        totalCharges: total,
      });
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage('Charges updated successfully.');
      setActiveModal(null);
    } catch (error) {
      setValidationError(toApiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveServiceTlJobCard = async () => {
    if (!workingTicket) return;
    setJcSavingDetails(true);
    setWorkflowError('');
    try {
      const updated = await ticketService.saveJobCardDetails(workingTicket.id, {
        initialObservation: jcInitialObservation.trim() || undefined,
        rootCause: jcRootCause.trim() || undefined,
        otherRequirements: jcOtherRequirements.trim() || undefined,
        estimatedCompletionAt: jcEstimatedCompletionAt
          ? new Date(jcEstimatedCompletionAt).toISOString()
          : undefined,
        partsCharges: sparePartsTotalCharges,
      });
      setJobCardDetail(updated);
      await onRefreshTicket?.(workingTicket.id);
      toast.success('Saved successfully!', {
        description: `Charges for this job card: ₹${sparePartsTotalCharges.toLocaleString('en-IN')}`,
      });
    } catch (saveError) {
      setWorkflowError(toApiErrorMessage(saveError));
    } finally {
      setJcSavingDetails(false);
    }
  };

  const handleFinalVerification = async (
    mode: 'READY_FOR_DELIVERY' | 'CLOSE_TICKET',
    payment?: TicketClosePaymentPayload
  ) => {
    if (!workingTicket) return;
    if (!jcCompletionDate || !jcCompletionTime || !jcCompletedByName.trim()) {
      setWorkflowError(
        'Completion Date, Completion Time and Technician Name are required for Final Verification.'
      );
      return;
    }
    setWorkflowActionLoading(true);
    setWorkflowError('');
    try {
      const payload = {
        actualCompletionAt: new Date(`${jcCompletionDate}T${jcCompletionTime}`).toISOString(),
        completedByName: jcCompletedByName.trim(),
        ...(payment
          ? {
              remarks: payment.remarks,
              paymentMode: payment.paymentMode,
              utrNumber: payment.utrNumber,
              amount: payment.amount,
            }
          : {}),
      };
      if (mode === 'CLOSE_TICKET') {
        await ticketService.closeTicketAfterVerification(workingTicket.id, payload);
        setShowClosePaymentModal(false);
      } else {
        await ticketService.markReadyForDeployment(workingTicket.id, payload);
      }
      await onRefreshTicket?.(workingTicket.id);
      await loadJobCard(workingTicket.id);
    } catch (verificationError) {
      setWorkflowError(toApiErrorMessage(verificationError));
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  const handleTicketCloseDecision = async (decision: 'YES' | 'NO') => {
    if (!workingTicket) return;
    if (decision === 'NO' && !closeDecisionRemarks.trim()) {
      setWorkflowError('Enter a reason why the ticket should remain open.');
      return;
    }
    setCloseDecisionBusy(true);
    setWorkflowError('');
    try {
      await ticketService.closeTicketDecision(workingTicket.id, {
        decision,
        remarks: closeDecisionRemarks.trim() || undefined,
      });
      setShowCloseTicketPrompt(false);
      setCloseDecisionRemarks('');
      await onRefreshTicket?.(workingTicket.id);
    } catch (caughtError) {
      setWorkflowError(toApiErrorMessage(caughtError));
    } finally {
      setCloseDecisionBusy(false);
    }
  };

  const runWorkflowTransition = async (action: () => Promise<unknown>, successMessage: string) => {
    if (!workingTicket) return;

    setWorkflowActionLoading(true);
    setWorkflowError('');
    try {
      await action();
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage(successMessage);
    } catch (error) {
      setWorkflowError(toApiErrorMessage(error));
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  const handleAssignServiceTl = async () => {
    if (!workingTicket) return;
    if (workflowServiceTlId.trim() === '') {
      setWorkflowError('Enter a Service Engineer user id to assign this ticket.');
      return;
    }

    await runWorkflowTransition(
      () =>
        ticketService.assignServiceTl(workingTicket.id, {
          serviceTlId: workflowServiceTlId.trim(),
        }),
      'Service Engineer assigned for review.'
    );
    setWorkflowServiceTlId('');
  };

  const handleTransferServiceTl = async () => {
    if (!workingTicket) return;
    if (workflowServiceTlId.trim() === '') {
      setWorkflowError('Select a Service Engineer to transfer this ticket to.');
      return;
    }

    await runWorkflowTransition(
      () =>
        ticketService.transferServiceTl(workingTicket.id, {
          serviceTlId: workflowServiceTlId.trim(),
        }),
      'Ticket transferred to another Service Engineer.'
    );
    setWorkflowServiceTlId('');
  };

  const handleResolveConsultation = async () => {
    if (!workingTicket) return;

    await runWorkflowTransition(
      () => ticketService.resolveConsultation(workingTicket.id),
      'Consultation resolved. Ticket closed with no job card.'
    );
  };

  const handleRequireWorkshop = async () => {
    if (!workingTicket) return;
    if (workflowWorkshopTechnicianId === '') {
      setWorkflowError('Select a technician to create the job card.');
      return;
    }

    await runWorkflowTransition(
      () =>
        ticketService.requireWorkshop(workingTicket.id, {
          technicianId: workflowWorkshopTechnicianId,
        }),
      'Job card created and technician assigned.'
    );
    setWorkflowWorkshopTechnicianId('');
  };

  const openCommentModal = (type: NewCommentType) => {
    setCommentType(type);
    setActiveModal('comment');
  };

  const handleAddComment = async () => {
    if (commentText.trim() === '') {
      setValidationError('Comment text is required.');
      return;
    }
    if (!workingTicket) return;

    const commentTypeApi = commentType;
    const commentRole = COMMENT_ROLE_MAP[toCommentChannel(commentType)];

    setActionLoading(true);
    setValidationError('');
    try {
      await commentService.addComment(workingTicket.id, {
        commentType: commentTypeApi,
        text: commentText.trim(),
        userName: toCommentAuthor(commentType),
        userRole: commentTypeApi === 'INTERNAL' ? 'COORDINATOR' : commentTypeApi,
      });
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage(`${commentRole} added successfully.`);
      setActiveModal(null);
    } catch (error) {
      setValidationError(toApiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAttachmentSelection = (files: File[]) => {
    if (files.length === 0) {
      setAttachmentFiles([]);
      return;
    }

    const invalidTypeFile = files.find((file) => !isSupportedAttachment(file));
    if (invalidTypeFile) {
      setValidationError('Only Images, PDF, and DOCX files are supported.');
      return;
    }

    const oversizedFile = files.find((file) => file.size > MOCK_ATTACHMENT_SIZE_LIMIT);
    if (oversizedFile) {
      setValidationError('Attachment size must be 5 MB or smaller.');
      return;
    }

    setValidationError('');
    setAttachmentFiles(files);
  };

  const handleUploadAttachments = async () => {
    if (attachmentFiles.length === 0) {
      setValidationError('Select at least one attachment.');
      return;
    }
    if (!workingTicket) return;

    setActionLoading(true);
    setValidationError('');
    try {
      await Promise.all(
        attachmentFiles.map((file) =>
          attachmentService.addAttachment(workingTicket.id, {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            uploadedBy: OPERATOR_NAME,
          })
        )
      );
      await onRefreshTicket?.(workingTicket.id);
      setCommunicationMessage(`${attachmentFiles.length} attachment(s) uploaded successfully.`);
      setActiveModal(null);
    } catch (error) {
      setValidationError(toApiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreviewAttachment = (attachment: TicketAttachment) => {
    setCommunicationMessage(
      `Preview unavailable in current backend version for ${attachment.name}.`
    );
  };

  const handleDownloadAttachment = (attachment: TicketAttachment) => {
    setCommunicationMessage(
      `Download unavailable in current backend version for ${attachment.name}.`
    );
  };

  return (
    <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
      <CardHeader className="mb-3">
        <div>
          <CardTitle>{workingTicket.ticketNumber}</CardTitle>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{workingTicket.category}</p>
        </div>
        <div className="flex items-center gap-2">
          <TicketPriorityBadge priority={workingTicket.priority} />
          <TicketStatusBadge status={workingTicket.status} />
        </div>
      </CardHeader>

      <div className="space-y-4">
        {communicationMessage !== '' && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-primary dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300">
            {communicationMessage}
          </div>
        )}

        <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Workflow Stage
            </h4>
            <Badge variant="info">{WORKFLOW_STAGE_LABELS[workingTicket.workflowStage]}</Badge>
          </div>
          {workingTicket.serviceTlName && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Service Engineer: {workingTicket.serviceTlName}
            </p>
          )}
          {workflowError !== '' && (
            <p className="mt-2 text-xs text-danger dark:text-red-400">{workflowError}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(workingTicket.workflowStage === 'CREATED' ||
              workingTicket.workflowStage === 'REOPENED') &&
              (currentUserRole === 'COORDINATOR' ||
                currentUserRole === 'ADMIN' ||
                currentUserRole === 'SERVICE_MANAGER') && (
                <>
                  <Select
                    value={workflowServiceTlId}
                    onChange={(event) => {
                      setWorkflowServiceTlId(event.target.value);
                      setWorkflowError('');
                    }}
                    placeholder="Select Service Engineer"
                    options={availableServiceTls.map((serviceTl) => ({
                      value: serviceTl.id,
                      label: serviceTl.name,
                    }))}
                  />
                  <Button
                    size="sm"
                    loading={workflowActionLoading}
                    disabled={workflowServiceTlId.trim() === ''}
                    onClick={() => void handleAssignServiceTl()}
                  >
                    Assign Service Engineer
                  </Button>
                </>
              )}
            {workingTicket.workflowStage === 'SERVICE_TL_REVIEW' &&
              (canActOnServiceTlReview ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={workflowServiceTlId}
                      onChange={(event) => {
                        setWorkflowServiceTlId(event.target.value);
                        setWorkflowError('');
                      }}
                      placeholder="Transfer to Service Engineer"
                      options={availableServiceTls.map((serviceTl) => ({
                        value: serviceTl.id,
                        label: serviceTl.name,
                      }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      loading={workflowActionLoading}
                      disabled={workflowServiceTlId.trim() === ''}
                      onClick={() => void handleTransferServiceTl()}
                    >
                      Transfer
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={workflowActionLoading}
                      onClick={() => void handleResolveConsultation()}
                    >
                      Resolved by Consultation
                    </Button>
                    <Select
                      value={workflowWorkshopTechnicianId}
                      onChange={(event) => {
                        setWorkflowWorkshopTechnicianId(event.target.value);
                        setWorkflowError('');
                      }}
                      placeholder="Select technician"
                      options={availableTechnicians.map((technician) => ({
                        value: technician.id,
                        label: technician.name,
                      }))}
                    />
                    <Button
                      size="sm"
                      loading={workflowActionLoading}
                      disabled={workflowWorkshopTechnicianId === ''}
                      onClick={() => void handleRequireWorkshop()}
                    >
                      Workshop Required
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  With the Service Engineer for review. Only the assigned Service Engineer can act
                  on this ticket.
                </p>
              ))}
            {workingTicket.workflowStage === 'CONSULTATION_RESOLVED' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consultation resolved — ticket closed, no job card was created.
              </p>
            )}
            {workingTicket.workflowStage === 'WORKSHOP_REQUIRED' && !workingTicket.jobCardStage && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Job card created.</p>
            )}
            {workingTicket.jobCardStage && (
              <div className="w-full">
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Job Card{' '}
                    {workingTicket.jobCardTechnicianName
                      ? `· ${workingTicket.jobCardTechnicianName}`
                      : ''}
                  </p>
                  <Badge variant="warning">
                    {jobCardDetail?.ticketId === workingTicket.id
                      ? jobCardDetail.effectiveStatusLabel
                      : JOB_CARD_STATUS_LABELS[workingTicket.jobCardStage]}
                  </Badge>
                </div>
                {canActOnJobCard ? (
                  <div className="mt-2 space-y-3">
                    {workingTicket.jobCardStage === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={workflowActionLoading}
                        onClick={() =>
                          void runWorkflowTransition(
                            () => ticketService.markWaitingForParts(workingTicket.id),
                            'Job card marked as waiting for parts.'
                          )
                        }
                      >
                        Waiting for Parts
                      </Button>
                    )}

                    {workingTicket.jobCardStage === 'IN_PROGRESS' && canActOnServiceTlReview && (
                      <div className="space-y-2 rounded-md border border-gray-200/80 p-3 dark:border-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Complete Job Card
                        </p>
                        {jobCardDetailLoading && (
                          <p className="text-xs text-gray-400">Loading job card…</p>
                        )}
                        {jobCardDetail && (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Assigned Technician: {jobCardDetail.technicianName}
                            </p>
                            <Textarea
                              aria-label="Initial observation"
                              placeholder="Initial Observation"
                              value={jcInitialObservation}
                              onChange={(event) => setJcInitialObservation(event.target.value)}
                              disabled={!jobCardDetail.editable}
                            />
                            <Textarea
                              aria-label="Root cause"
                              placeholder="Root Cause"
                              value={jcRootCause}
                              onChange={(event) => setJcRootCause(event.target.value)}
                              disabled={!jobCardDetail.editable}
                            />
                            <Textarea
                              aria-label="Other requirements"
                              placeholder="Other Requirements"
                              value={jcOtherRequirements}
                              onChange={(event) => setJcOtherRequirements(event.target.value)}
                              disabled={!jobCardDetail.editable}
                            />
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-500"
                                htmlFor="jc-eta"
                              >
                                ETA
                              </label>
                              <Input
                                id="jc-eta"
                                aria-label="Estimated completion date and time"
                                type="datetime-local"
                                value={jcEstimatedCompletionAt}
                                onChange={(event) => setJcEstimatedCompletionAt(event.target.value)}
                                disabled={!jobCardDetail.editable}
                              />
                            </div>

                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Spare Parts (approved via Technician request)
                            </p>
                            {jcSpareParts.length > 0 ? (
                              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-gray-50 uppercase text-gray-500 dark:bg-gray-800/60">
                                    <tr>
                                      <th className="px-3 py-2">Part Code</th>
                                      <th className="px-3 py-2">Part Name</th>
                                      <th className="px-3 py-2">Available</th>
                                      <th className="px-3 py-2">Required</th>
                                      <th className="px-3 py-2">Charges</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {jcSpareParts.map((part) => (
                                      <tr
                                        key={part.partId}
                                        className="border-t border-gray-100 dark:border-gray-800"
                                      >
                                        <td className="px-3 py-2">{part.partCode}</td>
                                        <td className="px-3 py-2">{part.partName}</td>
                                        <td className="px-3 py-2">{part.availableQuantity}</td>
                                        <td className="px-3 py-2">{part.requiredQuantity}</td>
                                        <td className="px-3 py-2">
                                          ₹
                                          {(
                                            Number(part.partCost || 0) * part.requiredQuantity
                                          ).toLocaleString('en-IN')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-gray-200 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                                      <td className="px-3 py-2" colSpan={4}>
                                        Total Charges
                                      </td>
                                      <td className="px-3 py-2">
                                        ₹{sparePartsTotalCharges.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">
                                No spare parts approved yet — approve a Technician request below to
                                populate this list.
                              </p>
                            )}
                            {jobCardDetail.editable && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  loading={jcSavingDetails}
                                  onClick={() => void handleSaveServiceTlJobCard()}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Visible whenever the Service Engineer can act, regardless of job card stage (In Progress,
                        Waiting for Parts, or Completed) - not just In Progress. A Technician typically submits
                        a spare part request right before marking the job Waiting for Parts, so gating this to
                        In Progress only left the Service Engineer with no control to approve it until the Technician
                        flipped the stage back - this was the reported "permission issue." */}
                    {canActOnServiceTlReview && workingTicket.jobCardStage !== 'RFD' && (
                      <div className="space-y-2 rounded-md border border-gray-200/80 p-3 dark:border-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Technician Spare Part Requests
                        </p>
                        <SparePartRequestsPanel
                          requests={jcSparePartRequests}
                          emptyMessage="No spare part requests from the Technician yet."
                          onApprove={(requestId, approvedQuantity) =>
                            void handleApproveSparePartRequest(requestId, approvedQuantity)
                          }
                          onReject={(requestId, remarks) =>
                            void handleRejectSparePartRequest(requestId, remarks)
                          }
                          onReverse={(requestId, remarks) =>
                            void handleReverseSparePartRequest(requestId, remarks)
                          }
                          onApproveAll={(items) => void handleApproveAllSparePartRequests(items)}
                          busyRequestId={jcSparePartRequestBusyId}
                          approveAllBusy={jcApproveAllBusy}
                          approvalFailures={jcApprovalFailures}
                        />
                      </div>
                    )}

                    {workingTicket.jobCardStage === 'WAITING_PARTS' && (
                      <Button
                        size="sm"
                        loading={workflowActionLoading}
                        onClick={() =>
                          void runWorkflowTransition(
                            () => ticketService.resumeRepair(workingTicket.id),
                            'Job card repair resumed.'
                          )
                        }
                      >
                        Resume Repair
                      </Button>
                    )}

                    {workingTicket.jobCardStage === 'COMPLETED' && canActOnServiceTlReview && (
                      <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="text-xs font-semibold uppercase tracking-wide text-warning dark:text-amber-300">
                          Final Verification
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <Input
                            aria-label="Completion date"
                            type="date"
                            value={jcCompletionDate}
                            onChange={(event) => setJcCompletionDate(event.target.value)}
                          />
                          <Input
                            aria-label="Completion time"
                            type="time"
                            value={jcCompletionTime}
                            onChange={(event) => setJcCompletionTime(event.target.value)}
                          />
                          <Select
                            aria-label="Technician name"
                            value={jcCompletedByName}
                            onChange={(event) => setJcCompletedByName(event.target.value)}
                            placeholder="Select technician"
                            options={availableTechnicians.map((technician) => ({
                              value: technician.name,
                              label: technician.name,
                            }))}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            loading={workflowActionLoading}
                            onClick={() => void handleFinalVerification('READY_FOR_DELIVERY')}
                          >
                            Ready for Delivery
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={workflowActionLoading}
                            onClick={() => {
                              if (
                                !jcCompletionDate ||
                                !jcCompletionTime ||
                                !jcCompletedByName.trim()
                              ) {
                                setWorkflowError(
                                  'Completion Date, Completion Time and Technician Name are required for Final Verification.'
                                );
                                return;
                              }
                              setShowClosePaymentModal(true);
                            }}
                          >
                            Close Ticket
                          </Button>
                        </div>
                        <p className="text-xs text-warning dark:text-amber-400">
                          Ready for Delivery sends this ticket to the Coordinator's Ready for
                          Delivery queue. Close Ticket closes it immediately (e.g. for an immediate
                          pickup with no separate delivery step).
                        </p>
                      </div>
                    )}
                    {workingTicket.jobCardStage === 'COMPLETED' && !canActOnServiceTlReview && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Completed by Technician — awaiting Service Engineer Final Verification.
                      </p>
                    )}

                    {workingTicket.jobCardStage === 'RFD' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ready for deployment — read-only. Vehicle deployment is managed in MSPL
                        Core.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    This job card is in the Workshop Workspace. Coordinators can view its status but
                    cannot update it here.
                  </p>
                )}
              </div>
            )}
            {workingTicket.workflowStage === 'RFD' &&
              (currentUserRole === 'COORDINATOR' ||
                currentUserRole === 'ADMIN' ||
                currentUserRole === 'SERVICE_MANAGER') && (
                <div className="w-full space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Ready for Delivery — close this Ticket?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={closeDecisionBusy}
                      onClick={() => void handleTicketCloseDecision('YES')}
                    >
                      Close Ticket
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={closeDecisionBusy}
                      onClick={() => setShowCloseTicketPrompt(true)}
                    >
                      Keep Ticket Open
                    </Button>
                  </div>
                  {showCloseTicketPrompt && (
                    <>
                      <Textarea
                        aria-label="Reason to keep ticket open"
                        placeholder="Required: reason the ticket remains open"
                        value={closeDecisionRemarks}
                        onChange={(event) => setCloseDecisionRemarks(event.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        loading={closeDecisionBusy}
                        onClick={() => void handleTicketCloseDecision('NO')}
                      >
                        Confirm Keep Open
                      </Button>
                    </>
                  )}
                </div>
              )}
          </div>
        </section>

        <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Quick Actions
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {(currentUserRole === 'ADMIN' ||
              currentUserRole === 'SERVICE_MANAGER' ||
              currentUserRole === 'SERVICE_TL') && (
              <Button size="sm" variant="outline" onClick={() => setActiveModal('assign')}>
                Assign Technician
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setActiveModal('status')}>
              Update Status
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveModal('eta')}>
              Update ETA
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveModal('charges')}>
              Update Charges
            </Button>
          </div>
        </section>

        <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Quick Communication Actions
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openCommentModal('INTERNAL')}>
              Add Internal Note
            </Button>
            <Button size="sm" variant="outline" onClick={() => openCommentModal('CUSTOMER')}>
              Add Rider Note
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveModal('attachment')}>
              Upload Attachment
            </Button>
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ticket Summary
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Ticket Number</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {workingTicket.ticketNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Status</dt>
              <dd>
                <TicketStatusBadge status={workingTicket.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Priority</dt>
              <dd>
                <TicketPriorityBadge priority={workingTicket.priority} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Category</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Issue Type</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.issueType}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">SLA Remaining</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {getSlaRemainingLabel(workingTicket)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Created Date</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatDateTime(workingTicket.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Last Updated</dt>
              <dd className="inline-flex items-center gap-1 text-gray-900 dark:text-gray-100">
                <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                {formatDateTime(workingTicket.lastActivity)}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Rider Information
          </h4>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Rider Name</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.riderName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Mobile Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Alternate Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.alternatePhone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Address</dt>
              <dd className="text-gray-700 dark:text-gray-300">{workingTicket.customerAddress}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Vehicle Information
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Vehicle Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.vehicle}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Vehicle Model</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.model}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Battery Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.batteryNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">VIN</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.vin}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Hub</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.hub}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Deployment Date</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatDateTime(workingTicket.deploymentDate)}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Technician
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Technician Name</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {workingTicket.assignedTechnician}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Technician Phone</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.technicianMobile}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Workshop</dt>
              <dd className="text-gray-900 dark:text-gray-100">{workingTicket.workshop}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Assigned Date</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatDateTime(workingTicket.assignmentDate)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Timeline
          </h4>
          <div className="mt-2">
            <TicketTimeline events={workingTicket.timelinePreview} />
          </div>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Comments
          </h4>
          <ul className="mt-2 space-y-1.5">
            {sortedComments.map((comment) => (
              <li
                key={comment.id}
                className={`rounded-md px-3 py-2 ${COMMENT_STYLE_MAP[comment.channel]}`}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {comment.author} • {COMMENT_ROLE_MAP[comment.channel]} •{' '}
                  {formatDateTime(comment.timestamp)}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{comment.message}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Attachments
          </h4>
          <ul className="mt-2 space-y-2">
            {sortedAttachments.map((attachment) => (
              <li
                key={attachment.id}
                className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getAttachmentIcon(attachment.fileType)}</div>
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{attachment.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Uploaded by {attachment.uploadedBy} •{' '}
                        {formatDateTime(attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => handlePreviewAttachment(attachment)}
                      disabled
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Download className="h-3.5 w-3.5" />}
                      onClick={() => handleDownloadAttachment(attachment)}
                      disabled
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      disabled
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Notification History
          </h4>
          <ul className="mt-2 space-y-1.5">
            {sortedNotifications.map((event) => (
              <li key={event.id} className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.channel.replace(/_/g, ' ')} • {event.recipient} •{' '}
                  {formatDateTime(event.timestamp)}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">Status: {event.status}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Financial Summary
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Security Deposit</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                INR {toCurrency(workingTicket.securityDeposit)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Estimated Repair Cost</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                INR {toCurrency(workingTicket.estimatedCharges)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Actual Repair Cost</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                INR {toCurrency(workingTicket.actualCharges)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Discount</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                INR {toCurrency(workingTicket.discount)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Outstanding Amount</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                INR {toCurrency(workingTicket.outstanding)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Activity Log
          </h4>
          <ul className="mt-2 space-y-1.5">
            {workingTicket.activityLog
              .slice()
              .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
              .map((entry) => (
                <li key={entry.id} className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ACTIVITY_LABELS[entry.activityType]} • {formatDateTime(entry.timestamp)}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{entry.detail}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    User: {entry.user ?? 'System'}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <Modal
        isOpen={activeModal === 'assign'}
        onClose={() => setActiveModal(null)}
        title="Assign Technician"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Available Technicians"
            value={selectedTechnician}
            onChange={(event) => {
              setSelectedTechnician(event.target.value);
              setValidationError('');
            }}
            options={availableTechnicians.map((technician) => ({
              value: technician.id,
              label: `${technician.name} • ${technician.workshop} • ${
                technician.availabilityStatus === 'BUSY' ? 'Busy' : 'Available'
              } (${technician.currentActiveTickets} active)`,
            }))}
            placeholder="Select technician"
          />
          {validationError !== '' && (
            <p className="text-xs text-danger dark:text-red-400">{validationError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssignTechnician}
              disabled={selectedTechnician === '' || actionLoading}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'status'}
        onClose={() => setActiveModal(null)}
        title="Update Status"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Status"
            value={nextStatus}
            onChange={(event) => {
              setNextStatus(event.target.value as TicketStatus);
              setValidationError('');
            }}
            options={STATUS_OPTIONS}
            placeholder="Select status"
          />
          <Textarea
            label="Reason"
            value={statusReason}
            onChange={(event) => {
              setStatusReason(event.target.value);
              setValidationError('');
            }}
            rows={3}
            placeholder="Enter status update reason"
          />
          {destructiveStatusSelected && (
            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={confirmDestructiveStatus}
                onChange={(event) => setConfirmDestructiveStatus(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              I confirm this status change is intentional and can impact downstream operations.
            </label>
          )}
          {validationError !== '' && (
            <p className="text-xs text-danger dark:text-red-400">{validationError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateStatus}
              disabled={
                nextStatus === '' ||
                statusReason.trim() === '' ||
                (destructiveStatusSelected && !confirmDestructiveStatus) ||
                actionLoading
              }
            >
              Save Status
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'eta'}
        onClose={() => setActiveModal(null)}
        title="Update ETA"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
            Previous ETA: {formatDateTime(workingTicket.eta)}
          </div>
          <Input
            label="New ETA"
            type="datetime-local"
            value={newEta}
            onChange={(event) => {
              setNewEta(event.target.value);
              setValidationError('');
            }}
          />
          <Textarea
            label="Reason"
            value={etaReason}
            onChange={(event) => {
              setEtaReason(event.target.value);
              setValidationError('');
            }}
            rows={3}
            placeholder="Enter reason for ETA change"
          />
          {validationError !== '' && (
            <p className="text-xs text-danger dark:text-red-400">{validationError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateEta}
              disabled={newEta.trim() === '' || etaReason.trim() === '' || actionLoading}
            >
              Save ETA
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'charges'}
        onClose={() => setActiveModal(null)}
        title="Update Charges"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Labour"
              type="number"
              min="0"
              value={labourCost}
              onChange={(event) => {
                setLabourCost(event.target.value);
                setValidationError('');
              }}
            />
            <Input
              label="Parts"
              type="number"
              min="0"
              value={partsCost}
              onChange={(event) => {
                setPartsCost(event.target.value);
                setValidationError('');
              }}
            />
            <Input
              label="Discount"
              type="number"
              min="0"
              value={discountValue}
              onChange={(event) => {
                setDiscountValue(event.target.value);
                setValidationError('');
              }}
            />
            <Input
              label="Total"
              type="number"
              min="0"
              value={totalCost}
              onChange={(event) => {
                setTotalCost(event.target.value);
                setValidationError('');
              }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Preview: Labour INR {toCurrency(chargesPreview.labour)} + Parts INR{' '}
            {toCurrency(chargesPreview.parts)} - Discount INR {toCurrency(chargesPreview.discount)};
            Total INR {toCurrency(chargesPreview.total)}.
          </p>
          {validationError !== '' && (
            <p className="text-xs text-danger dark:text-red-400">{validationError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateCharges}
              disabled={
                labourCost.trim() === '' ||
                partsCost.trim() === '' ||
                discountValue.trim() === '' ||
                totalCost.trim() === '' ||
                actionLoading
              }
            >
              Save Charges
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'comment'}
        onClose={() => setActiveModal(null)}
        title="Add Comment"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Comment Type"
            value={commentType}
            onChange={(event) => {
              setCommentType(event.target.value as NewCommentType);
              setValidationError('');
            }}
            options={[
              { value: 'INTERNAL', label: 'Internal Note' },
              { value: 'TECHNICIAN', label: 'Technician Note' },
              { value: 'CUSTOMER', label: 'Rider Note' },
            ]}
          />
          <Textarea
            label="Comment"
            value={commentText}
            onChange={(event) => {
              setCommentText(event.target.value);
              setValidationError('');
            }}
            rows={4}
            placeholder="Enter note"
          />
          {validationError !== '' && (
            <p className="text-xs text-danger dark:text-red-400">{validationError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddComment}
              disabled={commentText.trim() === '' || actionLoading}
            >
              Save Comment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'attachment'}
        onClose={() => setActiveModal(null)}
        title="Upload Attachment"
        size="md"
      >
        <div className="space-y-4">
          <Input
            type="file"
            multiple
            accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => handleAttachmentSelection(Array.from(event.target.files ?? []))}
            hint="Supported: Images, PDF, DOCX. Max size 5 MB each."
          />
          {attachmentFiles.length > 0 && (
            <ul className="rounded-md bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              {attachmentFiles.map((file) => (
                <li key={file.name + file.size}>{file.name}</li>
              ))}
            </ul>
          )}
          {validationError !== '' && (
            <p className="text-xs text-danger dark:text-red-400">{validationError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUploadAttachments}
              disabled={attachmentFiles.length === 0 || actionLoading}
            >
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      <TicketClosePaymentDialog
        isOpen={showClosePaymentModal}
        onClose={() => setShowClosePaymentModal(false)}
        onConfirm={(payment) => handleFinalVerification('CLOSE_TICKET', payment)}
        ticketId={workingTicket?.id ?? ''}
        chargesIncurred={
          jobCardDetail?.totalCharges ??
          workingTicket?.actualCharges ??
          workingTicket?.estimatedCharges ??
          null
        }
        finalSparePartsAmount={jobCardDetail?.finalSparePartsAmount ?? null}
        busy={workflowActionLoading}
      />
    </Card>
  );
}
