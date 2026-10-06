import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Textarea, Button, Input } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { formatDateTime } from '@/utils';
import { useAuthStore } from '@/store/authStore';
import {
  ticketService,
  type JobCardDetail,
  type JobCardSparePartItem,
} from '@/services/ticketService';
import { PartsWorkspace } from './PartsWorkspace';
import { PartsTimelinePanel } from './PartsTimelinePanel';
import { PhotoEvidencePanel } from './PhotoEvidencePanel';
import { ActivityTimelinePanel } from './ActivityTimelinePanel';

function toDateTimeLocalValue(isoDate: string | null): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

interface JobCardWorkspaceProps {
  ticketId: string;
  /** Called after any action that may move this job card between Active/Completed/History
   * (Mark Complete, Start Repair, etc.) so the parent list page can refresh. */
  onWorkflowChange?: () => void;
}

export function JobCardWorkspace({ ticketId, onWorkflowChange }: JobCardWorkspaceProps) {
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SERVICE_MANAGER';

  const [jobCardDetail, setJobCardDetail] = useState<JobCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [initialObservation, setInitialObservation] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('');
  const [technicianRemarks, setTechnicianRemarks] = useState('');
  const [labourCharges, setLabourCharges] = useState('');
  const [otherCharges, setOtherCharges] = useState('');
  const [totalCharges, setTotalCharges] = useState('');
  const [estimatedCompletionAt, setEstimatedCompletionAt] = useState('');
  const [savingJobCard, setSavingJobCard] = useState(false);

  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowError, setWorkflowError] = useState('');
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const spareParts = useMemo(() => jobCardDetail?.spareParts ?? [], [jobCardDetail]);
  const sparePartsTotalCharges = useMemo(
    () =>
      spareParts.reduce((sum, part) => sum + Number(part.partCost || 0) * part.requiredQuantity, 0),
    [spareParts]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const detail = await ticketService.getJobCardDetail(ticketId);
      setJobCardDetail(detail);
      setInitialObservation(detail.initialObservation ?? '');
      setRootCause(detail.rootCause ?? '');
      setWorkPerformed(detail.workPerformed ?? '');
      setOtherRequirements(detail.otherRequirements ?? '');
      setTechnicianRemarks(detail.technicianRemarks ?? '');
      setLabourCharges(detail.labourCharges ?? '');
      setOtherCharges(detail.otherCharges ?? '');
      setTotalCharges(detail.totalCharges ?? '');
      setEstimatedCompletionAt(toDateTimeLocalValue(detail.estimatedCompletionAt));
      setActivityRefreshKey((key) => key + 1);
    } catch (error) {
      setLoadError(toApiErrorMessage(error));
      setJobCardDetail(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSparePartsChanged = (updated: JobCardSparePartItem[]) => {
    setJobCardDetail((current) => (current ? { ...current, spareParts: updated } : current));
  };

  const handleSaveJobCardDetails = async () => {
    setSavingJobCard(true);
    setWorkflowError('');
    setWorkflowMessage('');
    try {
      const updated = await ticketService.saveJobCardDetails(ticketId, {
        initialObservation: initialObservation.trim() || undefined,
        rootCause: rootCause.trim() || undefined,
        workPerformed: workPerformed.trim() || undefined,
        otherRequirements: otherRequirements.trim() || undefined,
        technicianRemarks: technicianRemarks.trim() || undefined,
        labourCharges: labourCharges ? Number(labourCharges) : undefined,
        partsCharges: sparePartsTotalCharges,
        otherCharges: otherCharges ? Number(otherCharges) : undefined,
        totalCharges: totalCharges ? Number(totalCharges) : undefined,
        estimatedCompletionAt: estimatedCompletionAt
          ? new Date(estimatedCompletionAt).toISOString()
          : undefined,
      });
      setJobCardDetail(updated);
      setWorkflowMessage('Job card saved.');
    } catch (saveError) {
      setWorkflowError(toApiErrorMessage(saveError));
    } finally {
      setSavingJobCard(false);
    }
  };

  const handleDownloadPdf = async () => {
    setWorkflowError('');
    try {
      const blob = await ticketService.downloadJobCardPdf(ticketId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (downloadError) {
      setWorkflowError(toApiErrorMessage(downloadError));
    }
  };

  /** Completion date/time and Technician name are auto-captured server-side. If the job card has
   * unreconciled parts (issued but neither consumed nor returned), markJobCardCompleted rejects
   * with a 400 whose message lists exactly which parts - surfaced below via workflowError, same as
   * every other workflow error on this screen. Nothing here duplicates that check. */
  const handleCloseJobCardStage = async (action: 'waitingForParts' | 'markCompleted') => {
    setWorkflowBusy(true);
    setWorkflowError('');
    setWorkflowMessage('');
    try {
      if (action === 'waitingForParts') {
        await ticketService.markWaitingForParts(ticketId, {});
      } else {
        await ticketService.markJobCardCompleted(ticketId, {});
        setWorkflowMessage(
          'Job card marked completed and returned to the Service Engineer for final verification.'
        );
      }
      await load();
      onWorkflowChange?.();
    } catch (caughtError) {
      setWorkflowError(toApiErrorMessage(caughtError));
    } finally {
      setWorkflowBusy(false);
    }
  };

  const handleResumeRepair = () => runWorkflowAction(() => ticketService.resumeRepair(ticketId));

  const handleStartRepair = async () => {
    setWorkflowBusy(true);
    setWorkflowError('');
    try {
      await ticketService.startRepair(ticketId);
      await load();
      onWorkflowChange?.();
    } catch (caughtError) {
      setWorkflowError(toApiErrorMessage(caughtError));
    } finally {
      setWorkflowBusy(false);
    }
  };

  function runWorkflowAction(action: () => Promise<unknown>) {
    return (async () => {
      setWorkflowBusy(true);
      setWorkflowError('');
      try {
        await action();
        await load();
        onWorkflowChange?.();
      } catch (caughtError) {
        setWorkflowError(toApiErrorMessage(caughtError));
      } finally {
        setWorkflowBusy(false);
      }
    })();
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading job card…</p>;
  }
  if (loadError) {
    return <p className="text-sm text-danger">{loadError}</p>;
  }
  if (!jobCardDetail) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Job Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {jobCardDetail.jobCardNumber} · Linked Ticket {jobCardDetail.ticketNumber}
          </p>
          <p className="text-xs text-slate-400">
            Created {new Date(jobCardDetail.createdAt).toLocaleString()} by{' '}
            {jobCardDetail.createdBy}
          </p>
        </div>
        <Badge variant="info">{jobCardDetail.effectiveStatusLabel}</Badge>
      </div>

      {/* Customer & Vehicle Details */}
      <section>
        <h4 className="text-sm font-medium text-slate-700">
          Customer &amp; Vehicle Details (read-only)
        </h4>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Rider</dt>
            <dd>{jobCardDetail.rider.name}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Mobile</dt>
            <dd>{jobCardDetail.rider.mobile}</dd>
          </div>
          <div>
            <dt className="text-slate-400">MV Track No.</dt>
            <dd>{jobCardDetail.rider.mvTrackNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Vehicle Model</dt>
            <dd>{jobCardDetail.rider.vehicleModel ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Vehicle Type</dt>
            <dd>{jobCardDetail.rider.vehicleType ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Registration No.</dt>
            <dd>{jobCardDetail.rider.registrationNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Hub</dt>
            <dd>{jobCardDetail.rider.hub ?? '—'}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-400">
          Assigned Service Engineer: {jobCardDetail.assignment.serviceTlName ?? '—'} · Assigned
          Technician: {jobCardDetail.technicianName}
        </p>
      </section>

      {/* Complaint */}
      <section>
        <h4 className="text-sm font-medium text-slate-700">Complaint (read-only)</h4>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Rideability</dt>
            <dd>{jobCardDetail.complaint.rideabilityStatus ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Issue Category</dt>
            <dd>{jobCardDetail.complaint.issueCategory}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Issue Subcategory</dt>
            <dd>{jobCardDetail.complaint.issueSubcategory ?? '—'}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-slate-400">Rider Remarks</dt>
            <dd>{jobCardDetail.complaint.riderRemarks ?? '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Diagnosis */}
      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">Diagnosis (Service Engineer)</h4>
        <Textarea
          aria-label="Initial observation"
          placeholder="Initial observation"
          value={initialObservation}
          onChange={(event) => setInitialObservation(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
        <Textarea
          aria-label="Root cause"
          placeholder="Root cause"
          value={rootCause}
          onChange={(event) => setRootCause(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
        <Textarea
          aria-label="Other requirements"
          placeholder="Other requirements"
          value={otherRequirements}
          onChange={(event) => setOtherRequirements(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
      </section>

      {/* Technician Notes */}
      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">Technician Notes</h4>
        <Textarea
          aria-label="Work performed / parts changed"
          placeholder="Work performed / parts changed"
          value={workPerformed}
          onChange={(event) => setWorkPerformed(event.target.value)}
          disabled={!jobCardDetail.editable}
        />
        <Textarea
          aria-label="Technician remarks"
          placeholder="Technician remarks"
          value={technicianRemarks}
          onChange={(event) => setTechnicianRemarks(event.target.value)}
          disabled={!jobCardDetail.editable}
        />
      </section>

      {/* Parts (integrated: requested/approved/issued/consumed/returned/status) */}
      <section className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Parts</h4>
        <PartsWorkspace
          ticketId={ticketId}
          spareParts={spareParts}
          editable={jobCardDetail.editable}
          onSparePartsChanged={handleSparePartsChanged}
        />
        {jobCardDetail.partsRequisitionNumber && (
          <p className="text-xs text-slate-400">
            Parts Requisition {jobCardDetail.partsRequisitionNumber} created{' '}
            {jobCardDetail.partsRequisitionCreatedAt
              ? new Date(jobCardDetail.partsRequisitionCreatedAt).toLocaleString()
              : ''}
            {jobCardDetail.partsRequisitionClosedAt && (
              <> · Closed {new Date(jobCardDetail.partsRequisitionClosedAt).toLocaleString()}</>
            )}
          </p>
        )}
        {jobCardDetail.finalSparePartsAmount != null && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-semibold text-slate-900">
              Final Spare Parts Total (frozen): ₹
              {Number(jobCardDetail.finalSparePartsAmount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Locked at Ready for Deployment
              {jobCardDetail.readyForDeliveryByName
                ? ` by ${jobCardDetail.readyForDeliveryByName}`
                : ''}
              {jobCardDetail.readyForDeliveryAt
                ? ` on ${new Date(jobCardDetail.readyForDeliveryAt).toLocaleString()}`
                : ''}
              . Based only on consumed quantity - never recalculated.
            </p>
          </div>
        )}
      </section>

      {/* Parts Timeline */}
      <section className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Parts Timeline</h4>
        <PartsTimelinePanel events={jobCardDetail.partsTimeline} />
      </section>

      {/* Timeline & Activity Log */}
      <section className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Timeline &amp; Activity Log</h4>
        <ActivityTimelinePanel ticketId={ticketId} refreshKey={activityRefreshKey} />
      </section>

      {/* Photo Evidence */}
      <section className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Photo Evidence</h4>
        <PhotoEvidencePanel
          ticketId={ticketId}
          photos={jobCardDetail.complaint.riderPhotos}
          editable={jobCardDetail.editable}
          onAttached={() => void load()}
        />
      </section>

      {/* Charges */}
      <section className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Input
          aria-label="Labour charges"
          placeholder="Labour"
          type="number"
          min="0"
          value={labourCharges}
          onChange={(event) => setLabourCharges(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
        <Input
          aria-label="Parts charges"
          placeholder="Parts"
          type="number"
          min="0"
          value={sparePartsTotalCharges}
          hint="Auto-calculated from the spare parts list"
          disabled
          readOnly
        />
        <Input
          aria-label="Other charges"
          placeholder="Other"
          type="number"
          min="0"
          value={otherCharges}
          onChange={(event) => setOtherCharges(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
        <Input
          aria-label="Total charges"
          placeholder="Total"
          type="number"
          min="0"
          value={totalCharges}
          onChange={(event) => setTotalCharges(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
      </section>

      <section className="space-y-2">
        <label className="block text-xs font-medium text-slate-500" htmlFor="job-card-eta">
          Estimated Completion
        </label>
        <Input
          id="job-card-eta"
          aria-label="Estimated completion date and time"
          type="datetime-local"
          value={estimatedCompletionAt}
          onChange={(event) => setEstimatedCompletionAt(event.target.value)}
          disabled={!isAdmin || !jobCardDetail.editable}
        />
      </section>

      {workflowError && (
        <p role="alert" className="text-xs text-danger">
          {workflowError}
        </p>
      )}
      {workflowMessage && <p className="text-xs text-success">{workflowMessage}</p>}

      {jobCardDetail.editable && (
        <div className="flex flex-wrap gap-2">
          <Button loading={savingJobCard} onClick={() => void handleSaveJobCardDetails()}>
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => void handleDownloadPdf()}>
            Print PDF
          </Button>
        </div>
      )}

      {/* Repair Workflow */}
      <section className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Repair Workflow</h4>
        {jobCardDetail.workflowStage === 'RFD' && (
          <p className="text-xs text-slate-400">
            Ready for deployment — read-only. Vehicle deployment is managed in MSPL Core.
          </p>
        )}
        {jobCardDetail.workflowStage === 'COMPLETED' && (
          <p className="text-xs text-slate-400">
            Marked completed — waiting on Service Engineer final verification.
          </p>
        )}
        {(jobCardDetail.workflowStage === 'IN_PROGRESS' ||
          jobCardDetail.workflowStage === 'WAITING_PARTS') && (
          <>
            {jobCardDetail.repairStartedAt ? (
              <p className="text-xs text-slate-400">
                Repair started {formatDateTime(jobCardDetail.repairStartedAt)}.
              </p>
            ) : (
              <p className="text-xs text-warning">
                Repair not yet started — click Start Repair once you've received all spares from the
                Service Engineer. You can't mark the job complete until repair has started.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {!jobCardDetail.repairStartedAt && (
                <Button size="sm" loading={workflowBusy} onClick={() => void handleStartRepair()}>
                  Start Repair
                </Button>
              )}
              {jobCardDetail.workflowStage === 'IN_PROGRESS' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={workflowBusy}
                    onClick={() => void handleCloseJobCardStage('waitingForParts')}
                  >
                    Waiting for Parts
                  </Button>
                  <Button
                    size="sm"
                    loading={workflowBusy}
                    disabled={!jobCardDetail.repairStartedAt}
                    onClick={() => void handleCloseJobCardStage('markCompleted')}
                  >
                    Mark Complete
                  </Button>
                </>
              )}
              {jobCardDetail.workflowStage === 'WAITING_PARTS' && (
                <Button size="sm" loading={workflowBusy} onClick={() => void handleResumeRepair()}>
                  Resume Repair
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
