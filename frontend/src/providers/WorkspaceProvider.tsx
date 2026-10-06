import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { getWorkspace, type WorkspaceDefinition, type WorkspaceId } from '@/config/workspaces';
import { workspaceService } from '@/services/workspaceService';

interface WorkspaceContextValue {
  workspace: WorkspaceDefinition;
  selectWorkspace: (workspaceId: WorkspaceId) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>(() =>
    workspaceService.getSelectedId()
  );
  const selectWorkspace = useCallback((nextWorkspaceId: WorkspaceId) => {
    workspaceService.select(nextWorkspaceId);
    setWorkspaceId(nextWorkspaceId);
  }, []);
  const value = useMemo(
    () => ({ workspace: getWorkspace(workspaceId), selectWorkspace }),
    [workspaceId, selectWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
