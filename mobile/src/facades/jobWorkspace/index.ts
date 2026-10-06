import { JobWorkspaceFacadeImpl } from './JobWorkspaceFacadeImpl';
import type { JobWorkspaceFacade } from './JobWorkspaceFacade';

export type { JobWorkspaceFacade, JobWorkspaceData } from './JobWorkspaceFacade';
export { JobWorkspaceFacadeImpl } from './JobWorkspaceFacadeImpl';

/** Single instance the whole app shares - mirrors the repository singletons (`jobDetailsRepository`, `workflowRepository`, ...) this facade wraps. */
export const jobWorkspaceFacade: JobWorkspaceFacade = new JobWorkspaceFacadeImpl();
