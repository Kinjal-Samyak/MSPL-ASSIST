import { GraduationCap, Radio } from 'lucide-react';
import { WORKSPACES, type WorkspaceId } from '@/config/workspaces';
import { useWorkspace } from '@/hooks/useWorkspace';

const WORKSPACE_ICONS = { live: Radio, training: GraduationCap } as const;

export function WorkspaceSelector() {
  const { workspace, selectWorkspace } = useWorkspace();

  return (
    <fieldset className="space-y-3" aria-label="Choose workspace">
      <legend className="text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
        Choose Workspace
      </legend>
      <div className="grid gap-2">
        {WORKSPACES.map((option) => {
          const Icon = WORKSPACE_ICONS[option.id];
          const selected = workspace.id === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                selected
                  ? option.id === 'training'
                    ? 'border-warning bg-warning/5 dark:bg-amber-500/10'
                    : 'border-primary bg-primary/5 dark:bg-blue-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <input
                type="radio"
                name="workspace"
                value={option.id}
                checked={selected}
                onChange={() => selectWorkspace(option.id as WorkspaceId)}
                className="mt-1 h-4 w-4 accent-primary"
                aria-label={`${option.name}: ${option.description}`}
              />
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  option.id === 'training' ? 'text-warning' : 'text-primary'
                }`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
                  {option.name}
                </span>
                <span className="block text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
