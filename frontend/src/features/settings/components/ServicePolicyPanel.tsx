import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { THEME_COLORS } from '@/themes/tokens';
import { formatDateTime } from '@/utils';
import {
  servicePolicyService,
  type DefaultPriorityRule,
  type PriorityDefinition,
  type ServicePolicyVersion,
  type SlaStatusRule,
  type StageSlaTarget,
  type WorkshopSlaTarget,
} from '@/services/servicePolicyService';

interface ServicePolicyPanelProps {
  canEdit: boolean;
}

type ServicePolicyTab =
  'priorities' | 'defaultRules' | 'workshopSla' | 'stageSla' | 'slaStatus' | 'versions';

const DURATION_UNIT_OPTIONS = [
  { value: 'MINUTES', label: 'Minutes' },
  { value: 'HOURS', label: 'Hours' },
  { value: 'BUSINESS_DAYS', label: 'Business Days' },
];

const STAGE_LABELS: Record<string, string> = {
  TICKET_RESPONSE: 'Ticket Response',
  TECHNICIAN_ASSIGNMENT: 'Technician Assignment',
  INITIAL_DIAGNOSIS: 'Initial Diagnosis',
  SPARE_APPROVAL: 'Spare Approval',
  REPAIR: 'Repair',
  REDEPLOYMENT: 'Redeployment',
  TICKET_CLOSURE: 'Ticket Closure',
};

const STAGE_ORDER = Object.keys(STAGE_LABELS);

export function ServicePolicyPanel({ canEdit }: ServicePolicyPanelProps) {
  const [activeTab, setActiveTab] = useState<ServicePolicyTab>('priorities');

  const [priorities, setPriorities] = useState<PriorityDefinition[]>([]);
  const [defaultRules, setDefaultRules] = useState<DefaultPriorityRule[]>([]);
  const [workshopTargets, setWorkshopTargets] = useState<WorkshopSlaTarget[]>([]);
  const [stageTargets, setStageTargets] = useState<StageSlaTarget[]>([]);
  const [slaStatusRule, setSlaStatusRule] = useState<SlaStatusRule | null>(null);
  const [versions, setVersions] = useState<ServicePolicyVersion[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [prioritiesData, rulesData, workshopData, stageData, slaRuleData, versionsData] =
        await Promise.all([
          servicePolicyService.getPriorities(),
          servicePolicyService.getDefaultPriorityRules(),
          servicePolicyService.getWorkshopSlaTargets(),
          servicePolicyService.getStageSlaTargets(),
          servicePolicyService.getSlaStatusRule(),
          servicePolicyService.getVersions(),
        ]);
      setPriorities(prioritiesData);
      setDefaultRules(rulesData);
      setWorkshopTargets(workshopData);
      setStageTargets(stageData);
      setSlaStatusRule(slaRuleData);
      setVersions(versionsData);
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (successMessage === '') return undefined;
    const timeout = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const runMutation = async (handler: () => Promise<void>, successText: string) => {
    setSaving(true);
    setErrorMessage('');
    try {
      await handler();
      setSuccessMessage(successText);
      await loadAll();
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const priorityName = (priorityDefinitionId: string) =>
    priorities.find((priority) => priority.id === priorityDefinitionId)?.displayName ?? '—';

  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['priorities', 'Priorities'],
            ['defaultRules', 'Default Priority Rules'],
            ['workshopSla', 'Workshop SLA'],
            ['stageSla', 'Stage SLA'],
            ['slaStatus', 'SLA Status Rules'],
            ['versions', 'Configuration Versions'],
          ] as const
        ).map(([tab, label]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </Button>
        ))}
      </div>

      {successMessage !== '' && (
        <div className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}
      {errorMessage !== '' && (
        <div className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Loading Service Policy configuration…
        </p>
      ) : (
        <div className="mt-4">
          {activeTab === 'priorities' && (
            <PrioritiesSection
              priorities={priorities}
              canEdit={canEdit}
              saving={saving}
              runMutation={runMutation}
            />
          )}
          {activeTab === 'defaultRules' && (
            <DefaultRulesSection
              rules={defaultRules}
              priorities={priorities}
              priorityName={priorityName}
              canEdit={canEdit}
              saving={saving}
              runMutation={runMutation}
            />
          )}
          {activeTab === 'workshopSla' && (
            <WorkshopSlaSection
              targets={workshopTargets}
              priorityName={priorityName}
              canEdit={canEdit}
              saving={saving}
              runMutation={runMutation}
            />
          )}
          {activeTab === 'stageSla' && (
            <StageSlaSection
              targets={stageTargets}
              priorities={priorities}
              priorityName={priorityName}
              canEdit={canEdit}
              saving={saving}
              runMutation={runMutation}
            />
          )}
          {activeTab === 'slaStatus' && (
            <SlaStatusSection
              rule={slaStatusRule}
              canEdit={canEdit}
              saving={saving}
              runMutation={runMutation}
            />
          )}
          {activeTab === 'versions' && <VersionsSection versions={versions} />}
        </div>
      )}
    </Card>
  );
}

interface SectionCommonProps {
  canEdit: boolean;
  saving: boolean;
  runMutation: (handler: () => Promise<void>, successText: string) => Promise<void>;
}

function PrioritiesSection({
  priorities,
  canEdit,
  saving,
  runMutation,
}: SectionCommonProps & { priorities: PriorityDefinition[] }) {
  const [form, setForm] = useState({
    code: '',
    displayName: '',
    colorHex: THEME_COLORS.primary as string,
    description: '',
    sortOrder: (priorities.length + 1) * 10,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-2 py-2">Code</th>
              <th className="px-2 py-2">Display Name</th>
              <th className="px-2 py-2">Colour</th>
              <th className="px-2 py-2">Sort</th>
              <th className="px-2 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {priorities.map((priority) => (
              <tr key={priority.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                  {priority.code}
                </td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                  {priority.displayName}
                </td>
                <td className="px-2 py-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: priority.colorHex }}
                  />
                </td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{priority.sortOrder}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={priority.active ? 'success' : 'neutral'}>
                      {priority.active ? 'Active' : 'Inactive'}
                    </Badge>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={saving}
                        onClick={() =>
                          void runMutation(
                            () =>
                              servicePolicyService
                                .updatePriority(priority.id, { active: !priority.active })
                                .then(() => undefined),
                            `${priority.displayName} ${priority.active ? 'deactivated' : 'activated'}.`
                          )
                        }
                      >
                        {priority.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Add Priority
          </h4>
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <Input
            label="Colour"
            type="color"
            value={form.colorHex}
            onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
          />
          <Input
            label="Sort Order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button
            loading={saving}
            disabled={form.code.trim() === '' || form.displayName.trim() === ''}
            onClick={() =>
              void runMutation(
                () =>
                  servicePolicyService
                    .createPriority({
                      code: form.code.trim(),
                      displayName: form.displayName.trim(),
                      colorHex: form.colorHex,
                      description: form.description.trim() || undefined,
                      sortOrder: form.sortOrder,
                    })
                    .then(() => undefined),
                `Priority ${form.code.trim()} created.`
              )
            }
          >
            Create Priority
          </Button>
        </div>
      )}
    </div>
  );
}

function DefaultRulesSection({
  rules,
  priorities,
  priorityName,
  canEdit,
  saving,
  runMutation,
}: SectionCommonProps & {
  rules: DefaultPriorityRule[];
  priorities: PriorityDefinition[];
  priorityName: (id: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <th className="px-2 py-2">Condition</th>
            <th className="px-2 py-2">Operator</th>
            <th className="px-2 py-2">Value</th>
            <th className="px-2 py-2">Maps To</th>
            <th className="px-2 py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                {rule.condition.replace(/_/g, ' ')}
              </td>
              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{rule.operator}</td>
              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{rule.value}</td>
              <td className="px-2 py-2">
                {canEdit ? (
                  <Select
                    value={rule.priorityDefinitionId}
                    onChange={(e) =>
                      void runMutation(
                        () =>
                          servicePolicyService
                            .updateDefaultPriorityRule(rule.id, {
                              condition: rule.condition,
                              operator: rule.operator,
                              value: rule.value,
                              priorityDefinitionId: e.target.value,
                            })
                            .then(() => undefined),
                        'Default priority rule updated.'
                      )
                    }
                    options={priorities.map((priority) => ({
                      value: priority.id,
                      label: priority.displayName,
                    }))}
                  />
                ) : (
                  priorityName(rule.priorityDefinitionId)
                )}
              </td>
              <td className="px-2 py-2">
                <Badge variant={rule.active ? 'success' : 'neutral'}>
                  {rule.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {saving && <p className="mt-2 text-xs text-gray-400">Saving…</p>}
    </div>
  );
}

function WorkshopSlaSection({
  targets,
  priorityName,
  canEdit,
  saving,
  runMutation,
}: SectionCommonProps & { targets: WorkshopSlaTarget[]; priorityName: (id: string) => string }) {
  const [editing, setEditing] = useState<
    Record<string, { durationValue: number; durationUnit: string }>
  >({});

  const rowState = (target: WorkshopSlaTarget) =>
    editing[target.id] ?? {
      durationValue: target.durationValue,
      durationUnit: target.durationUnit,
    };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <th className="px-2 py-2">Priority</th>
            <th className="px-2 py-2">Duration</th>
            <th className="px-2 py-2">Unit</th>
            {canEdit && <th className="px-2 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => {
            const state = rowState(target);
            return (
              <tr key={target.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                  {priorityName(target.priorityDefinitionId)}
                </td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <Input
                      type="number"
                      value={state.durationValue}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [target.id]: { ...state, durationValue: Number(e.target.value) },
                        })
                      }
                    />
                  ) : (
                    target.durationValue
                  )}
                </td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <Select
                      value={state.durationUnit}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [target.id]: { ...state, durationUnit: e.target.value },
                        })
                      }
                      options={DURATION_UNIT_OPTIONS}
                    />
                  ) : (
                    target.durationUnit.replace('_', ' ')
                  )}
                </td>
                {canEdit && (
                  <td className="px-2 py-2">
                    <Button
                      size="sm"
                      loading={saving}
                      onClick={() =>
                        void runMutation(
                          () =>
                            servicePolicyService
                              .updateWorkshopSlaTarget(target.id, state)
                              .then(() => undefined),
                          `Workshop SLA for ${priorityName(target.priorityDefinitionId)} updated.`
                        )
                      }
                    >
                      Save
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StageSlaSection({
  targets,
  priorities,
  priorityName,
  canEdit,
  saving,
  runMutation,
}: SectionCommonProps & {
  targets: StageSlaTarget[];
  priorities: PriorityDefinition[];
  priorityName: (id: string) => string;
}) {
  const [editing, setEditing] = useState<
    Record<string, { durationValue: number; durationUnit: string }>
  >({});

  const sortedTargets = [...targets].sort((left, right) => {
    const stageDiff = STAGE_ORDER.indexOf(left.stageKey) - STAGE_ORDER.indexOf(right.stageKey);
    if (stageDiff !== 0) return stageDiff;
    return priorityName(left.priorityDefinitionId).localeCompare(
      priorityName(right.priorityDefinitionId)
    );
  });

  const rowState = (target: StageSlaTarget) =>
    editing[target.id] ?? {
      durationValue: target.durationValue,
      durationUnit: target.durationUnit,
    };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <th className="px-2 py-2">Stage</th>
            <th className="px-2 py-2">Priority</th>
            <th className="px-2 py-2">Owner Role</th>
            <th className="px-2 py-2">Duration</th>
            <th className="px-2 py-2">Unit</th>
            {canEdit && <th className="px-2 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedTargets.map((target) => {
            const state = rowState(target);
            return (
              <tr key={target.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                  {STAGE_LABELS[target.stageKey] ?? target.stageKey}
                </td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                  {priorityName(target.priorityDefinitionId)}
                </td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                  {target.ownerRole.replace('_', ' ')}
                </td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <Input
                      type="number"
                      value={state.durationValue}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [target.id]: { ...state, durationValue: Number(e.target.value) },
                        })
                      }
                    />
                  ) : (
                    target.durationValue
                  )}
                </td>
                <td className="px-2 py-2">
                  {canEdit ? (
                    <Select
                      value={state.durationUnit}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [target.id]: { ...state, durationUnit: e.target.value },
                        })
                      }
                      options={DURATION_UNIT_OPTIONS}
                    />
                  ) : (
                    target.durationUnit.replace('_', ' ')
                  )}
                </td>
                {canEdit && (
                  <td className="px-2 py-2">
                    <Button
                      size="sm"
                      loading={saving}
                      onClick={() =>
                        void runMutation(
                          () =>
                            servicePolicyService
                              .updateStageSlaTarget(target.id, state)
                              .then(() => undefined),
                          `${STAGE_LABELS[target.stageKey] ?? target.stageKey} SLA for ${priorityName(target.priorityDefinitionId)} updated.`
                        )
                      }
                    >
                      Save
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {priorities.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">No priorities configured yet.</p>
      )}
    </div>
  );
}

function SlaStatusSection({
  rule,
  canEdit,
  saving,
  runMutation,
}: SectionCommonProps & { rule: SlaStatusRule | null }) {
  const [threshold, setThreshold] = useState(rule?.atRiskThresholdPct ?? 20);

  useEffect(() => {
    if (rule) setThreshold(rule.atRiskThresholdPct);
  }, [rule]);

  return (
    <div className="max-w-sm space-y-3">
      <Input
        label="At-Risk Threshold (%)"
        type="number"
        min={1}
        max={99}
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        disabled={!canEdit}
        hint="A stage/ticket is flagged At Risk once remaining time falls below this percentage of the target."
      />
      {canEdit && (
        <Button
          loading={saving}
          onClick={() =>
            void runMutation(
              () =>
                servicePolicyService
                  .updateSlaStatusRule({ atRiskThresholdPct: threshold })
                  .then(() => undefined),
              'SLA Status Rule updated.'
            )
          }
        >
          Save
        </Button>
      )}
    </div>
  );
}

function VersionsSection({ versions }: { versions: ServicePolicyVersion[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <th className="px-2 py-2">Version</th>
            <th className="px-2 py-2">Effective From</th>
            <th className="px-2 py-2">Created By</th>
            <th className="px-2 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <tr key={version.id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                {version.versionLabel}
              </td>
              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                {formatDateTime(version.effectiveFrom)}
              </td>
              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                {version.createdByName ?? 'System'}
              </td>
              <td className="px-2 py-2">
                <Badge variant={version.isCurrent ? 'success' : 'neutral'}>
                  {version.isCurrent ? 'Current' : 'Superseded'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
