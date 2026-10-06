import {
  getDefaultWorkspaceId,
  getWorkspace,
  type WorkspaceDefinition,
  type WorkspaceId,
  WORKSPACE_STORAGE_KEY,
} from '@/config/workspaces';

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const workspaceService = {
  getSelectedId(): WorkspaceId {
    if (!storageAvailable()) return getDefaultWorkspaceId();
    const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return stored === 'training' || stored === 'live' ? stored : getDefaultWorkspaceId();
  },

  getSelected(): WorkspaceDefinition {
    return getWorkspace(this.getSelectedId());
  },

  select(workspaceId: WorkspaceId): void {
    if (storageAvailable()) {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    }
  },

  getApiBaseUrl(): string {
    const workspace = this.getSelected();
    if (!workspace.apiBaseUrl) {
      throw new Error(`${workspace.name} is not configured for this deployment.`);
    }
    return workspace.apiBaseUrl;
  },
};
