import { useCallback, useEffect, useMemo, useState } from 'react';
import { toApiErrorMessage } from '@/services/apiService';
import { useAuthStore } from '@/store/authStore';
import { lookupService, type TechnicianLookupResponse } from '@/services/lookupService';
import { ticketService, type JobCardListItem, type JobCardStage } from '@/services/ticketService';

/** Shared list-loading/filtering logic behind the four Technician Workspace nav pages (Dashboard,
 * Active Jobs, Completed Jobs, Job History) - each just narrows by workflowStage and reuses the
 * same job-card list, search and (Admin-only) technician filter. */
export function useTechnicianJobCards(stages?: JobCardStage[]) {
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SERVICE_MANAGER';

  const [jobCards, setJobCards] = useState<JobCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [availableTechnicians, setAvailableTechnicians] = useState<TechnicianLookupResponse[]>([]);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCardListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ticketService.listJobCards();
      setJobCards(data);
      setSelectedJobCard((current) =>
        current ? (data.find((item) => item.id === current.id) ?? null) : null
      );
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
      setJobCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    lookupService
      .getTechnicians()
      .then((technicians) => {
        if (active) setAvailableTechnicians(technicians);
      })
      .catch(() => {
        if (active) setAvailableTechnicians([]);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const technicianNameById = useMemo(() => {
    const map = new Map<string, string>();
    availableTechnicians.forEach((technician) =>
      map.set(technician.technicianId, technician.technicianName)
    );
    return map;
  }, [availableTechnicians]);

  const stageFiltered = useMemo(
    () =>
      stages ? jobCards.filter((jobCard) => stages.includes(jobCard.workflowStage)) : jobCards,
    [jobCards, stages]
  );

  const visibleJobCards = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stageFiltered.filter((jobCard) => {
      const matchesSearch =
        !term ||
        jobCard.ticketNumber.toLowerCase().includes(term) ||
        jobCard.customerName.toLowerCase().includes(term);
      const matchesTechnician = !technicianFilter || jobCard.technicianId === technicianFilter;
      return matchesSearch && matchesTechnician;
    });
  }, [stageFiltered, search, technicianFilter]);

  return {
    isAdmin,
    loading,
    error,
    jobCards: stageFiltered,
    visibleJobCards,
    search,
    setSearch,
    technicianFilter,
    setTechnicianFilter,
    availableTechnicians,
    technicianNameById,
    selectedJobCard,
    setSelectedJobCard,
    reload: load,
  };
}
