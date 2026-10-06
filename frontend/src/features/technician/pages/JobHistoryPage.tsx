import { History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTechnicianJobCards } from '../hooks/useTechnicianJobCards';
import { JobCardListPanel } from '../components/JobCardListPanel';

/** Full, unfiltered read-only archive of every job card (any workflow stage) - distinct from
 * Completed Job Cards, which only covers COMPLETED/RFD. */
export function JobHistoryPage() {
  const list = useTechnicianJobCards();

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <History className="h-6 w-6 text-primary" />
            Job History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Full history of job cards across every stage.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void list.reload()}
          loading={list.loading}
        >
          Refresh
        </Button>
      </header>
      <JobCardListPanel
        title={list.isAdmin ? 'All Job Cards' : 'My Job Card History'}
        jobCards={list.jobCards}
        visibleJobCards={list.visibleJobCards}
        loading={list.loading}
        error={list.error}
        isAdmin={list.isAdmin}
        search={list.search}
        onSearchChange={list.setSearch}
        technicianFilter={list.technicianFilter}
        onTechnicianFilterChange={list.setTechnicianFilter}
        availableTechnicians={list.availableTechnicians}
        technicianNameById={list.technicianNameById}
        selectedJobCard={list.selectedJobCard}
        onSelectJobCard={list.setSelectedJobCard}
        onWorkflowChange={list.reload}
        emptyMessage="No job cards found."
      />
    </div>
  );
}
