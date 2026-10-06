import { PackageCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { COMPLETED_JOB_CARD_STAGES } from '../constants';
import { useTechnicianJobCards } from '../hooks/useTechnicianJobCards';
import { JobCardListPanel } from '../components/JobCardListPanel';

export function CompletedJobsPage() {
  const list = useTechnicianJobCards(COMPLETED_JOB_CARD_STAGES);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <PackageCheck className="h-6 w-6 text-primary" />
            Completed Job Cards
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Marked complete and pending Service Engineer verification, or already Ready for
            Deployment.
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
        title={list.isAdmin ? 'Completed Job Cards' : 'My Completed Job Cards'}
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
        emptyMessage="No completed job cards yet."
      />
    </div>
  );
}
