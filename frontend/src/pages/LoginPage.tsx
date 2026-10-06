import type React from 'react';
import { Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { TrainingWorkspaceBanner } from '@/components/TrainingWorkspaceBanner';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { useAuth, useWorkspace } from '@/hooks';

type WorkspaceServiceStatus =
  'available' | 'checking' | 'offline' | 'unconfigured' | 'wrong-environment';

interface HealthResponse {
  environment?: 'production' | 'training';
}

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const { workspace } = useWorkspace();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [workspaceServiceStatus, setWorkspaceServiceStatus] =
    useState<WorkspaceServiceStatus>('checking');
  const [availableWorkspaceApiBaseUrl, setAvailableWorkspaceApiBaseUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!workspace.apiBaseUrl) {
      setWorkspaceServiceStatus('unconfigured');
      setAvailableWorkspaceApiBaseUrl(null);
      return;
    }

    const controller = new AbortController();
    const expectedEnvironment = workspace.id === 'training' ? 'training' : 'production';
    setWorkspaceServiceStatus('checking');
    setAvailableWorkspaceApiBaseUrl(null);

    void fetch(`${workspace.apiBaseUrl}/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!controller.signal.aborted) {
          const health = response.ok
            ? ((await response.json().catch((): HealthResponse => ({}))) as HealthResponse)
            : null;
          const environmentMatches = health?.environment === expectedEnvironment;
          const available = response.ok && environmentMatches;
          setWorkspaceServiceStatus(
            available ? 'available' : response.ok ? 'wrong-environment' : 'offline'
          );
          setAvailableWorkspaceApiBaseUrl(available ? workspace.apiBaseUrl : null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setWorkspaceServiceStatus('offline');
          setAvailableWorkspaceApiBaseUrl(null);
        }
      });

    return () => controller.abort();
  }, [workspace.apiBaseUrl, workspace.id]);

  const workspaceUnavailable =
    workspaceServiceStatus !== 'available' || availableWorkspaceApiBaseUrl !== workspace.apiBaseUrl;
  const workspaceName = workspace.id === 'training' ? 'Training' : 'Live';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-white">MA</span>
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white">MSPL Assist</span>
      </div>

      <Card>
        <h1 className="mb-6 text-2xl font-semibold leading-8 text-gray-900 dark:text-gray-100">
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <WorkspaceSelector />

          {workspace.id === 'training' && <TrainingWorkspaceBanner />}

          {workspaceServiceStatus === 'checking' && (
            <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
              Checking {workspaceName} service availability…
            </p>
          )}

          {workspaceServiceStatus === 'unconfigured' && (
            <p
              className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
              role="status"
            >
              {workspaceName} service is not configured for this deployment. Set its dedicated API
              URL to sign in.
            </p>
          )}

          {workspaceServiceStatus === 'offline' && (
            <p
              className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
              role="status"
            >
              {workspaceName} service is offline. Start its dedicated backend and try again.
            </p>
          )}

          {workspaceServiceStatus === 'wrong-environment' && (
            <p
              className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
              role="status"
            >
              The selected {workspaceName} Workspace points to the wrong backend environment. Check
              the workspace API configuration before signing in.
            </p>
          )}

          <Input
            label="Email address"
            type="email"
            placeholder="you@mspl.in"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            leftElement={<Mail className="h-4 w-4" />}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            leftElement={<Lock className="h-4 w-4" />}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            disabled={workspaceUnavailable}
            className="mt-2"
          >
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
