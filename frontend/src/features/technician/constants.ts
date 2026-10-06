import type { JobCardStage } from '@/services/ticketService';

/** Module-level (stable identity) stage groupings behind the Active Jobs / Completed Jobs nav
 * pages - matches JOB_CARD_STATUS_LABELS in constants/jobCardStatus.ts. */
export const ACTIVE_JOB_CARD_STAGES: JobCardStage[] = ['IN_PROGRESS', 'WAITING_PARTS'];
export const COMPLETED_JOB_CARD_STAGES: JobCardStage[] = ['COMPLETED', 'RFD'];
