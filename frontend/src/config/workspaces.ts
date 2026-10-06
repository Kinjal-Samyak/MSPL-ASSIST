import { env } from './env';

export type WorkspaceId = 'live' | 'training';

export interface WorkspaceDefinition {
  id: WorkspaceId;
  name: string;
  description: string;
  apiBaseUrl: string | null;
}

export const WORKSPACE_STORAGE_KEY = 'mspl-assist.workspace';

const trainingApiBaseUrl =
  env.VITE_TRAINING_API_BASE_URL ??
  (env.VITE_MSPL_RUNTIME_ENV?.toLowerCase() === 'training' ? env.VITE_API_BASE_URL : null);

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  {
    id: 'live',
    name: 'Live Workspace',
    description: 'Real operational environment',
    apiBaseUrl: env.VITE_LIVE_API_BASE_URL ?? env.VITE_API_BASE_URL,
  },
  {
    id: 'training',
    name: 'Training Workspace',
    description: 'Safe practice environment',
    apiBaseUrl: trainingApiBaseUrl,
  },
];

export function getWorkspace(id: WorkspaceId): WorkspaceDefinition {
  return WORKSPACES.find((workspace) => workspace.id === id) ?? WORKSPACES[0];
}

export function getDefaultWorkspaceId(): WorkspaceId {
  return env.VITE_MSPL_RUNTIME_ENV?.toLowerCase() === 'training' ? 'training' : 'live';
}
