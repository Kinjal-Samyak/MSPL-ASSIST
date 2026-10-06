import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type { JobCardListItem } from '@/services/ticketService';
import type { TechnicianLookupResponse } from '@/services/lookupService';
import { JobCardWorkspace } from './JobCardWorkspace';

interface JobCardListPanelProps {
  title: string;
  jobCards: JobCardListItem[];
  visibleJobCards: JobCardListItem[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  technicianFilter: string;
  onTechnicianFilterChange: (value: string) => void;
  availableTechnicians: TechnicianLookupResponse[];
  technicianNameById: Map<string, string>;
  selectedJobCard: JobCardListItem | null;
  onSelectJobCard: (jobCard: JobCardListItem) => void;
  onWorkflowChange: () => void;
  emptyMessage: string;
}

/** Shared list + drill-in workspace shell for the Active Jobs / Completed Jobs / Job History nav
 * pages - each one just supplies its own pre-filtered job card set and empty-state copy. */
export function JobCardListPanel({
  title,
  jobCards,
  visibleJobCards,
  loading,
  error,
  isAdmin,
  search,
  onSearchChange,
  technicianFilter,
  onTechnicianFilterChange,
  availableTechnicians,
  technicianNameById,
  selectedJobCard,
  onSelectJobCard,
  onWorkflowChange,
  emptyMessage,
}: JobCardListPanelProps) {
  return (
    <Card className="border-slate-200 bg-white" padding="md">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isAdmin && (
            <Select
              aria-label="Filter by technician"
              value={technicianFilter}
              onChange={(event) => onTechnicianFilterChange(event.target.value)}
              placeholder="All technicians"
              className="sm:w-56"
              options={availableTechnicians.map((technician) => ({
                value: technician.technicianId,
                label: technician.technicianName,
              }))}
            />
          )}
          <Input
            aria-label="Search job cards by ticket number or rider"
            placeholder="Search ticket number or rider"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            leftElement={<Search className="h-4 w-4" />}
            className="sm:w-72"
          />
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-slate-400">Loading job cards…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleJobCards.length === 0 && (
            <p className="text-sm text-slate-400">
              {jobCards.length === 0 ? emptyMessage : 'No job cards match your filters.'}
            </p>
          )}
          {visibleJobCards.map((jobCard) => (
            <button
              key={jobCard.id}
              type="button"
              onClick={() => onSelectJobCard(jobCard)}
              className={`rounded-lg border p-3 text-left text-sm ${selectedJobCard?.id === jobCard.id ? 'border-primary bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <p className="font-semibold text-primary">{jobCard.ticketNumber}</p>
              <p className="text-slate-600">{jobCard.customerName}</p>
              {isAdmin && (
                <p className="text-xs text-slate-500">
                  {technicianNameById.get(jobCard.technicianId) ?? 'Unassigned'}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">{jobCard.effectiveStatusLabel}</p>
            </button>
          ))}
        </div>
      )}
      {selectedJobCard && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <JobCardWorkspace
            ticketId={selectedJobCard.ticketId}
            onWorkflowChange={onWorkflowChange}
          />
        </div>
      )}
    </Card>
  );
}
