import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ErrorState } from '@/components/feedback';
import { Modal } from '@/components/layout';
import { Button, Card, Input, Select } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  adminService,
  type AdminDashboardResponse,
  type AdminHub,
  type AdminPermissionItem,
  type AdminRoleItem,
  type AdminSetting,
  type AdminUser,
} from '@/services/adminService';
import {
  type OneDriveDrive,
  type OneDriveItem,
  type ConfigurationPreviewResponse,
  type GraphAuthStatusResponse,
  type InventoryColumnMapping,
  type MasterColumnMapping,
  type MappingSuggestionResponse,
  type PersistedSyncRun,
  type SyncRunSummary,
  operationalDataService,
  type OperationalDataSettings,
  type WorkbookHeadersResponse,
  type WorkbookValidationResponse,
} from '@/services/operationalDataService';
import { useAuthStore } from '@/store';
import { formatDateTime } from '@/utils';
import {
  AdminDashboard,
  AdminUserDetailsDrawer,
  AdminUserFilters,
  AdminUsersTable,
  HubManagementPanel,
  OperationalDataConfigurationPanel,
  type WizardFormState,
  RolePermissionMatrix,
  ServicePolicyPanel,
  SystemSettingsPanel,
} from '../components';
import type {
  AdminUserFiltersState,
  AdminUserFormState,
  AdminUserSortState,
} from '../types/admin.types';

const PAGE_SIZE = 10;

const DEFAULT_DASHBOARD: AdminDashboardResponse = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  totalRoles: 0,
  totalPermissions: 0,
  totalHubs: 0,
  totalSettings: 0,
};

const DEFAULT_FILTERS: AdminUserFiltersState = {
  search: '',
  role: '',
  active: '',
  hubId: '',
};

const DEFAULT_SORT: AdminUserSortState = {
  key: 'updatedAt',
  direction: 'desc',
};

const DEFAULT_USER_FORM: AdminUserFormState = {
  name: '',
  email: '',
  mobile: '',
  role: 'COORDINATOR',
  hubIds: [],
  password: '',
};

const PASSWORD_COMPLEXITY_HINT =
  'At least 8 characters, including 1 uppercase, 1 lowercase, 1 number and 1 special character.';

function findPasswordComplexityError(password: string): string {
  const issues: string[] = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) issues.push('one uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('one lowercase letter');
  if (!/[0-9]/.test(password)) issues.push('one number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('one special character');
  return issues.length > 0 ? `Password must contain ${issues.join(', ')}.` : '';
}

const DEFAULT_HUB_FORM = {
  name: '',
  city: '',
  state: '',
};

type AdminTab = 'users' | 'roles' | 'hubs' | 'settings' | 'servicePolicy';

const DEFAULT_OPERATIONAL_DATA_FORM: WizardFormState = {
  masterWorkbookName: '',
  masterWorkbookUrl: '',
  inventoryWorkbookName: '',
  inventoryWorkbookUrl: '',
  masterDriveId: '',
  masterItemId: '',
  inventoryDriveId: '',
  inventoryItemId: '',
  masterWorksheet: '',
  inventoryWorksheet: '',
  relationshipMasterColumn: '',
  relationshipInventoryColumn: '',
  autoSyncEnabled: false,
  syncFrequency: 'MANUAL',
};

const OPERATIONAL_DATA_WORKBOOK_DRAFT_KEY = 'mspl-operational-workbook-draft';

function readOperationalWorkbookDraft(): Partial<WizardFormState> | null {
  try {
    const raw = window.localStorage.getItem(OPERATIONAL_DATA_WORKBOOK_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardFormState>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function persistOperationalWorkbookDraft(form: WizardFormState): void {
  try {
    window.localStorage.setItem(
      OPERATIONAL_DATA_WORKBOOK_DRAFT_KEY,
      JSON.stringify({
        masterWorkbookName: form.masterWorkbookName,
        masterWorkbookUrl: form.masterWorkbookUrl,
        masterDriveId: form.masterDriveId,
        masterItemId: form.masterItemId,
        inventoryWorkbookName: form.inventoryWorkbookName,
        inventoryWorkbookUrl: form.inventoryWorkbookUrl,
        inventoryDriveId: form.inventoryDriveId,
        inventoryItemId: form.inventoryItemId,
      })
    );
  } catch {
    // intentionally ignore storage errors
  }
}

function normalizeHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findHeaderByCandidates(headers: string[], candidates: string[]): string | null {
  if (headers.length === 0) return null;
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeaderKey(header),
  }));
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeaderKey(candidate);
    const exact = normalizedHeaders.find((entry) => entry.normalized === normalizedCandidate);
    if (exact) return exact.original;
  }
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeaderKey(candidate);
    const partial = normalizedHeaders.find(
      (entry) =>
        entry.normalized.includes(normalizedCandidate) ||
        normalizedCandidate.includes(entry.normalized)
    );
    if (partial) return partial.original;
  }
  return null;
}

function resolveHeader(
  headers: string[],
  preferred: string | undefined | null,
  aliases: string[],
  fallback: string
): string {
  if (preferred && headers.includes(preferred)) {
    return preferred;
  }
  const matched = findHeaderByCandidates(headers, aliases);
  if (matched) {
    return matched;
  }
  return fallback;
}

export function SettingsPage() {
  const requestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const role = useAuthStore((state) => state.user?.role);
  const canRead = role === 'ADMIN' || role === 'SERVICE_MANAGER' || role === 'COORDINATOR';
  const canWrite = role === 'ADMIN' || role === 'SERVICE_MANAGER';

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD);
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [permissions, setPermissions] = useState<AdminPermissionItem[]>([]);
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [operationalDataSettings, setOperationalDataSettings] =
    useState<OperationalDataSettings | null>(null);
  const [operationalDataForm, setOperationalDataForm] = useState<WizardFormState>(
    DEFAULT_OPERATIONAL_DATA_FORM
  );
  const [workbookValidation, setWorkbookValidation] = useState<WorkbookValidationResponse | null>(
    null
  );
  const [graphAuthStatus, setGraphAuthStatus] = useState<GraphAuthStatusResponse | null>(null);
  const [workbookHeaders, setWorkbookHeaders] = useState<WorkbookHeadersResponse | null>(null);
  const [mappingSuggestions, setMappingSuggestions] = useState<MappingSuggestionResponse | null>(
    null
  );
  const [configurationPreview, setConfigurationPreview] =
    useState<ConfigurationPreviewResponse | null>(null);
  const [oneDriveDrives, setOneDriveDrives] = useState<OneDriveDrive[]>([]);
  const [oneDriveItems, setOneDriveItems] = useState<OneDriveItem[]>([]);
  const [oneDriveSelectedDriveId, setOneDriveSelectedDriveId] = useState('');
  const [oneDriveParentStack, setOneDriveParentStack] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingOneDrive, setLoadingOneDrive] = useState(false);
  const oneDriveBrowseRequestIdRef = useRef(0);
  const [wizardValidationMessages, setWizardValidationMessages] = useState<string[]>([]);
  const [latestSyncSummary, setLatestSyncSummary] = useState<SyncRunSummary | null>(null);
  const [workbookLoadRevision, setWorkbookLoadRevision] = useState(0);
  const {
    masterWorkbookUrl,
    inventoryWorkbookUrl,
    masterDriveId,
    masterItemId,
    inventoryDriveId,
    inventoryItemId,
    masterWorksheet,
    inventoryWorksheet,
  } = operationalDataForm;

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortState, setSortState] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [deleteUserConfirmInput, setDeleteUserConfirmInput] = useState('');

  const [createUserForm, setCreateUserForm] = useState<AdminUserFormState>(DEFAULT_USER_FORM);
  const [editUserForm, setEditUserForm] = useState<AdminUserFormState>(DEFAULT_USER_FORM);
  const [hubForm, setHubForm] = useState(DEFAULT_HUB_FORM);
  const [editingHubId, setEditingHubId] = useState('');

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailError, setDetailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!canRead) return;
    const requestId = ++requestIdRef.current;
    setLoadingPage(true);
    setErrorMessage('');
    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search: filters.search.trim() || undefined,
        role: filters.role || undefined,
        active: filters.active === '' ? undefined : filters.active === 'true',
        hubId: filters.hubId || undefined,
        sortBy: sortState.key,
        sortOrder: sortState.direction,
      };
      const [
        dashboardResponse,
        usersResponse,
        rolesResponse,
        permissionsResponse,
        hubsResponse,
        settingsResponse,
        operationalDataResponse,
        graphAuthResponse,
      ] = await Promise.all([
        adminService.getDashboard(),
        adminService.getUsers(query),
        adminService.getRoles(),
        adminService.getPermissions(),
        adminService.getHubs(),
        adminService.getSettings(),
        operationalDataService.getSettings(),
        operationalDataService.getGraphAuthStatus(),
      ]);

      if (requestId !== requestIdRef.current) return;

      setDashboard(dashboardResponse);
      setUsers(
        usersResponse.items.map((item) => ({
          ...item,
          createdAt: formatDateTime(item.createdAt),
          updatedAt: formatDateTime(item.updatedAt),
        }))
      );
      setTotalRecords(usersResponse.totalRecords);
      setRoles(rolesResponse);
      setPermissions(permissionsResponse);
      setHubs(hubsResponse);
      setSettings(
        settingsResponse.map((item) => ({ ...item, updatedAt: formatDateTime(item.updatedAt) }))
      );
      setOperationalDataSettings(operationalDataResponse);
      setGraphAuthStatus(graphAuthResponse);
      const draft = readOperationalWorkbookDraft();
      const initialForm: WizardFormState = {
        masterWorkbookName: operationalDataResponse.masterWorkbook ?? '',
        masterWorkbookUrl: operationalDataResponse.masterWorkbookUrl ?? '',
        inventoryWorkbookName: operationalDataResponse.inventoryWorkbook ?? '',
        inventoryWorkbookUrl: operationalDataResponse.inventoryWorkbookUrl ?? '',
        masterDriveId: operationalDataResponse.masterDriveId ?? '',
        masterItemId: operationalDataResponse.masterItemId ?? '',
        inventoryDriveId: operationalDataResponse.inventoryDriveId ?? '',
        inventoryItemId: operationalDataResponse.inventoryItemId ?? '',
        masterWorksheet: operationalDataResponse.masterWorksheet,
        inventoryWorksheet: operationalDataResponse.inventoryWorksheet,
        relationshipMasterColumn: operationalDataResponse.relationshipMasterColumn ?? '',
        relationshipInventoryColumn: operationalDataResponse.relationshipInventoryColumn ?? '',
        autoSyncEnabled: operationalDataResponse.autoSyncEnabled,
        syncFrequency: operationalDataResponse.syncFrequency,
      };

      const shouldApplyDraft =
        (!initialForm.masterItemId && !!draft?.masterItemId) ||
        (!initialForm.inventoryItemId && !!draft?.inventoryItemId);
      const nextForm = shouldApplyDraft ? { ...initialForm, ...draft } : initialForm;
      setOperationalDataForm(nextForm);
      setOneDriveSelectedDriveId(
        operationalDataResponse.masterDriveId ?? operationalDataResponse.inventoryDriveId ?? ''
      );
      setOneDriveParentStack([]);
      setOneDriveItems([]);
      setWorkbookValidation(null);
      setWorkbookHeaders(null);
      setMappingSuggestions(null);
      setConfigurationPreview(null);

      if (usersResponse.items.length > 0 && !selectedUserId) {
        setSelectedUserId(usersResponse.items[0].userId);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setErrorMessage(toApiErrorMessage(error));
      setUsers([]);
      setTotalRecords(0);
      setOperationalDataSettings(null);
      setGraphAuthStatus(null);
      setOneDriveDrives([]);
      setOneDriveItems([]);
      setOneDriveSelectedDriveId('');
      setOneDriveParentStack([]);
      setWorkbookValidation(null);
      setWorkbookHeaders(null);
      setMappingSuggestions(null);
      setConfigurationPreview(null);
      setLatestSyncSummary(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingPage(false);
      }
    }
  }, [
    canRead,
    filters.active,
    filters.hubId,
    filters.role,
    filters.search,
    page,
    selectedUserId,
    sortState.direction,
    sortState.key,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (successMessage === '') return undefined;
    const timeout = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const loadSelectedUser = useCallback(async (userId: string) => {
    const requestId = ++detailRequestIdRef.current;
    setLoadingUserDetail(true);
    setDetailError('');
    try {
      const detail = await adminService.getUserById(userId);
      if (requestId !== detailRequestIdRef.current) return;
      setSelectedUser(detail);
      setEditUserForm({
        name: detail.name,
        email: detail.email,
        mobile: detail.mobile,
        role: detail.role,
        hubIds: detail.hubIds,
        password: '',
      });
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) return;
      setDetailError(toApiErrorMessage(error));
      setSelectedUser(null);
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setLoadingUserDetail(false);
      }
    }
  }, []);

  const runMutation = useCallback(
    async (
      handler: () => Promise<unknown>,
      successText: string,
      options?: { reloadData?: boolean; reloadSelectedUser?: boolean }
    ) => {
      setSaving(true);
      setErrorMessage('');
      try {
        await handler();
        setSuccessMessage(successText);
        if (options?.reloadData !== false) {
          await loadData();
        }
        if ((options?.reloadSelectedUser ?? true) && selectedUserId && isUserDrawerOpen) {
          await loadSelectedUser(selectedUserId);
        }
      } catch (error) {
        setErrorMessage(toApiErrorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [isUserDrawerOpen, loadData, loadSelectedUser, selectedUserId]
  );

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setErrorMessage('');
    try {
      await adminService.deleteUser(selectedUserId);
      setSuccessMessage('User deleted successfully.');
      setIsUserDrawerOpen(false);
      setSelectedUserId(null);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [selectedUserId, loadData]);

  const runLocalAction = useCallback(
    async (handler: () => Promise<unknown>, successText: string) => {
      setErrorMessage('');
      try {
        await handler();
        setSuccessMessage(successText);
      } catch (error) {
        setErrorMessage(toApiErrorMessage(error));
      }
    },
    []
  );

  const getWorkbookSourcePayload = useCallback(
    (form: WizardFormState) => ({
      masterWorkbookUrl: form.masterWorkbookUrl || undefined,
      inventoryWorkbookUrl: form.inventoryWorkbookUrl || undefined,
      masterDriveId: form.masterDriveId || undefined,
      masterItemId: form.masterItemId || undefined,
      inventoryDriveId: form.inventoryDriveId || undefined,
      inventoryItemId: form.inventoryItemId || undefined,
    }),
    []
  );

  const getHeaderPayload = useCallback(
    (form: WizardFormState) => ({
      ...getWorkbookSourcePayload(form),
      masterWorksheet: form.masterWorksheet,
      inventoryWorksheet: form.inventoryWorksheet,
      headerRow: 1,
    }),
    [getWorkbookSourcePayload]
  );
  const workbookSourcePayload = useMemo(
    () => ({
      masterWorkbookUrl: masterWorkbookUrl || undefined,
      inventoryWorkbookUrl: inventoryWorkbookUrl || undefined,
      masterDriveId: masterDriveId || undefined,
      masterItemId: masterItemId || undefined,
      inventoryDriveId: inventoryDriveId || undefined,
      inventoryItemId: inventoryItemId || undefined,
    }),
    [
      inventoryDriveId,
      inventoryItemId,
      inventoryWorkbookUrl,
      masterDriveId,
      masterItemId,
      masterWorkbookUrl,
    ]
  );
  const headerPayload = useMemo(
    () => ({
      ...workbookSourcePayload,
      masterWorksheet,
      inventoryWorksheet,
      headerRow: 1,
    }),
    [workbookSourcePayload, inventoryWorksheet, masterWorksheet]
  );

  const loadOneDriveDrives = useCallback(async () => {
    if (!canWrite) return;
    setLoadingOneDrive(true);
    try {
      const drives = await operationalDataService.getOneDriveDrives();
      setOneDriveDrives(drives);
      if (drives.length > 0 && !oneDriveSelectedDriveId) {
        setOneDriveSelectedDriveId(drives[0].id);
      }
    } finally {
      setLoadingOneDrive(false);
    }
  }, [canWrite, oneDriveSelectedDriveId]);

  const browseOneDriveItems = useCallback(
    async (driveId: string, parentItemId?: string) => {
      if (!canWrite || !driveId) return;
      const requestId = ++oneDriveBrowseRequestIdRef.current;
      setLoadingOneDrive(true);
      try {
        const result = await operationalDataService.browseOneDriveItems(driveId, parentItemId);
        if (requestId === oneDriveBrowseRequestIdRef.current) setOneDriveItems(result.items);
      } finally {
        if (requestId === oneDriveBrowseRequestIdRef.current) setLoadingOneDrive(false);
      }
    },
    [canWrite]
  );

  const refreshLatestSyncSummary = useCallback(async () => {
    try {
      const history = await operationalDataService.getSyncHistory(1);
      const latest = history[0] as PersistedSyncRun | undefined;
      setLatestSyncSummary(latest?.summary ?? null);
    } catch {
      setLatestSyncSummary(null);
    }
  }, []);

  useEffect(() => {
    void refreshLatestSyncSummary();
  }, [refreshLatestSyncSummary]);

  useEffect(() => {
    if (!canWrite || !graphAuthStatus?.authenticated) return;
    void loadOneDriveDrives();
  }, [canWrite, graphAuthStatus?.authenticated, loadOneDriveDrives]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    if (!code) return;
    void runMutation(
      async () => {
        const status = await operationalDataService.exchangeGraphAuthCode(code);
        setGraphAuthStatus(status);
        query.delete('code');
        query.delete('state');
        const nextUrl = query.toString()
          ? `${window.location.pathname}?${query.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, document.title, nextUrl);
      },
      'Microsoft 365 authentication connected successfully.',
      {
        reloadData: false,
        reloadSelectedUser: false,
      }
    );
  }, [runMutation]);

  useEffect(() => {
    if (!graphAuthStatus?.authenticated) {
      setWorkbookValidation(null);
      setWorkbookHeaders(null);
      setMappingSuggestions(null);
      setConfigurationPreview(null);
      return;
    }

    const hasWorkbookSources =
      !!masterDriveId && !!masterItemId && !!inventoryDriveId && !!inventoryItemId;

    if (!hasWorkbookSources) {
      setWorkbookValidation(null);
      setWorkbookHeaders(null);
      setMappingSuggestions(null);
      setConfigurationPreview(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await operationalDataService.validateWorkbookUrls(workbookSourcePayload);
        if (cancelled) return;
        setWorkbookValidation(result);
        setOperationalDataForm((current) => ({
          ...current,
          masterWorksheet: result.masterWorkbook.autoSelectedWorksheet ?? current.masterWorksheet,
          inventoryWorksheet:
            result.inventoryWorkbook.autoSelectedWorksheet ?? current.inventoryWorksheet,
        }));
        setSuccessMessage('Worksheets loaded automatically from selected workbooks.');
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toApiErrorMessage(error));
        setWorkbookValidation(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    graphAuthStatus?.authenticated,
    inventoryDriveId,
    inventoryItemId,
    masterDriveId,
    masterItemId,
    workbookSourcePayload,
    workbookLoadRevision,
  ]);

  useEffect(() => {
    if (!graphAuthStatus?.authenticated) {
      setWorkbookHeaders(null);
      setMappingSuggestions(null);
      setConfigurationPreview(null);
      return;
    }

    const hasSourcesAndWorksheets =
      !!masterDriveId &&
      !!masterItemId &&
      !!inventoryDriveId &&
      !!inventoryItemId &&
      !!masterWorksheet &&
      !!inventoryWorksheet;

    if (!hasSourcesAndWorksheets) {
      setWorkbookHeaders(null);
      setMappingSuggestions(null);
      setConfigurationPreview(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await operationalDataService.loadWorkbookHeaders(headerPayload);
        if (cancelled) return;
        setWorkbookHeaders(result);
        setOperationalDataForm((current) => {
          const masterExists = result.masterHeaders.includes(current.relationshipMasterColumn);
          const inventoryExists = result.inventoryHeaders.includes(
            current.relationshipInventoryColumn
          );
          return {
            ...current,
            relationshipMasterColumn: masterExists
              ? current.relationshipMasterColumn
              : (result.masterHeaders[0] ?? ''),
            relationshipInventoryColumn: inventoryExists
              ? current.relationshipInventoryColumn
              : (result.inventoryHeaders[0] ?? ''),
          };
        });
        setSuccessMessage('Relationship columns loaded automatically from worksheet headers.');
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toApiErrorMessage(error));
        setWorkbookHeaders(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    graphAuthStatus?.authenticated,
    inventoryDriveId,
    inventoryItemId,
    inventoryWorksheet,
    masterDriveId,
    masterItemId,
    masterWorksheet,
    headerPayload,
    workbookLoadRevision,
  ]);

  useEffect(() => {
    const messages: string[] = [];

    if (!operationalDataForm.masterDriveId || !operationalDataForm.masterItemId) {
      messages.push('Master workbook is missing.');
    }
    if (!operationalDataForm.inventoryDriveId || !operationalDataForm.inventoryItemId) {
      messages.push('Inventory workbook is missing.');
    }
    if (!operationalDataForm.masterWorksheet) {
      messages.push('Master worksheet is not selected.');
    }
    if (!operationalDataForm.inventoryWorksheet) {
      messages.push('Inventory worksheet is not selected.');
    }

    if (workbookValidation) {
      const masterExists = workbookValidation.masterWorkbook.worksheets.includes(
        operationalDataForm.masterWorksheet
      );
      const inventoryExists = workbookValidation.inventoryWorkbook.worksheets.includes(
        operationalDataForm.inventoryWorksheet
      );
      if (!masterExists) {
        messages.push('Selected master worksheet no longer exists in the workbook.');
      }
      if (!inventoryExists) {
        messages.push('Selected inventory worksheet no longer exists in the workbook.');
      }
    }

    if (!operationalDataForm.relationshipMasterColumn) {
      messages.push('Relationship master column is not selected.');
    }
    if (!operationalDataForm.relationshipInventoryColumn) {
      messages.push('Relationship inventory column is not selected.');
    }

    if (workbookHeaders) {
      if (!workbookHeaders.masterHeaders.includes(operationalDataForm.relationshipMasterColumn)) {
        messages.push('Selected relationship master column is missing from worksheet headers.');
      }
      if (
        !workbookHeaders.inventoryHeaders.includes(operationalDataForm.relationshipInventoryColumn)
      ) {
        messages.push('Selected relationship inventory column is missing from worksheet headers.');
      }
    }

    setWizardValidationMessages(messages);
  }, [
    operationalDataForm.inventoryDriveId,
    operationalDataForm.inventoryItemId,
    operationalDataForm.inventoryWorksheet,
    operationalDataForm.masterDriveId,
    operationalDataForm.masterItemId,
    operationalDataForm.masterWorksheet,
    operationalDataForm.relationshipInventoryColumn,
    operationalDataForm.relationshipMasterColumn,
    workbookHeaders,
    workbookValidation,
  ]);

  const roleDescription = useMemo(() => {
    if (role === 'ADMIN') return 'Full administrative access';
    if (role === 'SERVICE_MANAGER')
      return 'Same access as Administrator, except deleting a service ticket';
    if (role === 'COORDINATOR') return 'Read-only administrative access';
    return 'No administrative access';
  }, [role]);

  if (!canRead) {
    return (
      <div className="p-6">
        <ErrorState
          title="Access restricted"
          message="Only ADMIN can access Admin module. Coordinators have read-only visibility where applicable."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Admin & Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{roleDescription}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadData()}
        >
          Refresh
        </Button>
      </div>

      {successMessage !== '' && (
        <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm text-success dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          {successMessage}
        </div>
      )}
      {errorMessage !== '' && (
        <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {errorMessage}
        </div>
      )}

      <AdminDashboard {...dashboard} />

      <div className="flex flex-wrap gap-2">
        {(['users', 'roles', 'hubs', 'settings', 'servicePolicy'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'users'
              ? 'User Management'
              : tab === 'roles'
                ? 'Roles & Permissions'
                : tab === 'hubs'
                  ? 'Hub Management'
                  : tab === 'settings'
                    ? 'System Settings'
                    : 'Service Policy'}
          </Button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          {canWrite && (
            <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <Input
                  placeholder="Name"
                  value={createUserForm.name}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Email"
                  value={createUserForm.email}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <Input
                  placeholder="Mobile"
                  value={createUserForm.mobile}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, mobile: event.target.value }))
                  }
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={createUserForm.password}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                  hint={PASSWORD_COMPLEXITY_HINT}
                />
                <Select
                  value={createUserForm.role}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({
                      ...current,
                      role: event.target.value as AdminUserFormState['role'],
                    }))
                  }
                  options={[
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'SERVICE_MANAGER', label: 'Service Manager' },
                    { value: 'COORDINATOR', label: 'Coordinator' },
                    { value: 'SERVICE_TL', label: 'Service Engineer' },
                    { value: 'TECHNICIAN', label: 'Technician' },
                  ]}
                />
                <Button
                  onClick={() => {
                    const passwordError = findPasswordComplexityError(createUserForm.password);
                    if (passwordError !== '') {
                      setErrorMessage(passwordError);
                      return;
                    }
                    void runMutation(async () => {
                      await adminService.createUser(createUserForm);
                      setCreateUserForm(DEFAULT_USER_FORM);
                    }, 'User created successfully.');
                  }}
                  loading={saving}
                >
                  Create User
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-800 md:grid-cols-3">
                {hubs.map((hub) => (
                  <label
                    key={hub.hubId}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={createUserForm.hubIds.includes(hub.hubId)}
                      onChange={(event) =>
                        setCreateUserForm((current) => ({
                          ...current,
                          hubIds: event.target.checked
                            ? [...current.hubIds, hub.hubId]
                            : current.hubIds.filter((hubId) => hubId !== hub.hubId),
                        }))
                      }
                    />
                    <span>{hub.name}</span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          <AdminUserFilters
            filters={filters}
            hubs={hubs}
            onChange={(updates) => {
              setFilters((current) => ({ ...current, ...updates }));
              setPage(1);
            }}
          />

          <AdminUsersTable
            rows={users}
            selectedUserId={selectedUserId}
            onSelectUser={(item) => {
              setSelectedUserId(item.userId);
              setIsUserDrawerOpen(true);
              void loadSelectedUser(item.userId);
            }}
            loading={loadingPage}
            page={page}
            perPage={PAGE_SIZE}
            total={totalRecords}
            onPageChange={setPage}
            sortState={sortState}
            onSortChange={(nextSort) => {
              setSortState(nextSort);
              setPage(1);
            }}
          />
        </div>
      )}

      {activeTab === 'roles' && <RolePermissionMatrix roles={roles} permissions={permissions} />}

      {activeTab === 'hubs' && (
        <HubManagementPanel
          hubs={hubs}
          canEdit={canWrite}
          form={hubForm}
          editingHubId={editingHubId}
          onFormChange={(updates) => setHubForm((current) => ({ ...current, ...updates }))}
          onSelectHub={(hubId) => {
            const hub = hubs.find((entry) => entry.hubId === hubId);
            if (!hub) return;
            setEditingHubId(hub.hubId);
            setHubForm({
              name: hub.name,
              city: hub.city,
              state: hub.state,
            });
          }}
          onSave={() =>
            void runMutation(
              async () => {
                if (editingHubId) {
                  await adminService.updateHub(editingHubId, hubForm);
                } else {
                  await adminService.createHub(hubForm);
                }
                setHubForm(DEFAULT_HUB_FORM);
                setEditingHubId('');
              },
              editingHubId ? 'Hub updated successfully.' : 'Hub created successfully.'
            )
          }
          saving={saving}
        />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <OperationalDataConfigurationPanel
            form={operationalDataForm}
            settings={operationalDataSettings}
            canEdit={canWrite}
            saving={saving}
            workbookValidation={workbookValidation}
            graphAuthStatus={graphAuthStatus}
            headers={workbookHeaders}
            mappingSuggestions={mappingSuggestions}
            preview={configurationPreview}
            validationMessages={wizardValidationMessages}
            runSyncEnabled={wizardValidationMessages.length === 0}
            syncSummary={
              latestSyncSummary
                ? {
                    processed: latestSyncSummary.rowsRead,
                    matched: latestSyncSummary.rowsUpdated,
                    unmatched: latestSyncSummary.rowsSkipped,
                    errors: latestSyncSummary.rowsFailed,
                    status: latestSyncSummary.status,
                    completedAt: latestSyncSummary.endTime,
                    operationalMetrics: latestSyncSummary.operationalMetrics,
                  }
                : null
            }
            onFormChange={(updates) =>
              setOperationalDataForm((current) => {
                const next = {
                  ...current,
                  ...updates,
                };
                if (
                  updates.masterWorksheet !== undefined ||
                  updates.inventoryWorksheet !== undefined
                ) {
                  setWorkbookHeaders(null);
                  setMappingSuggestions(null);
                  setConfigurationPreview(null);
                }
                persistOperationalWorkbookDraft(next);
                return next;
              })
            }
            onValidateWorkbooks={() =>
              void runMutation(
                async () => {
                  const result = await operationalDataService.validateWorkbookUrls({
                    ...getWorkbookSourcePayload(operationalDataForm),
                  });
                  setWorkbookValidation(result);
                  setOperationalDataForm((current) => ({
                    ...current,
                    masterWorksheet:
                      result.masterWorkbook.autoSelectedWorksheet ?? current.masterWorksheet,
                    inventoryWorksheet:
                      result.inventoryWorkbook.autoSelectedWorksheet ?? current.inventoryWorksheet,
                  }));
                },
                'Workbooks validated successfully.',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
            onAuthenticateGraph={() =>
              void runMutation(
                async () => {
                  const result = await operationalDataService.getGraphAuthUrl();
                  window.location.assign(result.authorizationUrl);
                },
                'Redirecting to Microsoft 365 authentication...',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
            oneDriveLoading={loadingOneDrive}
            oneDriveDrives={oneDriveDrives}
            oneDriveItems={oneDriveItems}
            selectedDriveId={oneDriveSelectedDriveId}
            canBrowseUp={oneDriveParentStack.length > 0}
            oneDriveBreadcrumbs={['Home', ...oneDriveParentStack.map((entry) => entry.name)]}
            onSelectDrive={(driveId) => {
              setOneDriveSelectedDriveId(driveId);
              setOneDriveItems([]);
              setOneDriveParentStack([]);
            }}
            onLoadOneDriveDrives={() =>
              void runLocalAction(async () => {
                await loadOneDriveDrives();
              }, 'OneDrive list refreshed.')
            }
            onBrowseOneDriveRoot={() =>
              void runLocalAction(async () => {
                if (!oneDriveSelectedDriveId) {
                  throw new Error('Select a OneDrive first.');
                }
                await browseOneDriveItems(oneDriveSelectedDriveId);
                setOneDriveParentStack([]);
              }, 'OneDrive root loaded successfully.')
            }
            onBrowseOneDriveFolder={(folderItemId) =>
              void runLocalAction(async () => {
                if (!oneDriveSelectedDriveId) {
                  throw new Error('Select a OneDrive first.');
                }
                await browseOneDriveItems(oneDriveSelectedDriveId, folderItemId);
                const folderName =
                  oneDriveItems.find((entry) => entry.id === folderItemId)?.name ?? 'Folder';
                setOneDriveParentStack((current) => [
                  ...current,
                  { id: folderItemId, name: folderName },
                ]);
              }, 'Folder loaded successfully.')
            }
            onBrowseOneDriveBack={() =>
              void runLocalAction(async () => {
                if (!oneDriveSelectedDriveId) {
                  throw new Error('Select a OneDrive first.');
                }
                const nextStack = oneDriveParentStack.slice(0, -1);
                const nextParentId =
                  nextStack.length > 0 ? nextStack[nextStack.length - 1].id : undefined;
                await browseOneDriveItems(oneDriveSelectedDriveId, nextParentId);
                setOneDriveParentStack(nextStack);
              }, 'Moved back.')
            }
            onBrowseOneDriveUp={() =>
              void runLocalAction(async () => {
                if (!oneDriveSelectedDriveId) {
                  throw new Error('Select a OneDrive first.');
                }
                const nextStack = oneDriveParentStack.slice(0, -1);
                const nextParentId =
                  nextStack.length > 0 ? nextStack[nextStack.length - 1].id : undefined;
                await browseOneDriveItems(oneDriveSelectedDriveId, nextParentId);
                setOneDriveParentStack(nextStack);
              }, 'Moved to parent folder.')
            }
            onRefreshOneDriveCurrentFolder={() =>
              void runLocalAction(async () => {
                if (!oneDriveSelectedDriveId) {
                  throw new Error('Select a OneDrive first.');
                }
                const currentParentId =
                  oneDriveParentStack.length > 0
                    ? oneDriveParentStack[oneDriveParentStack.length - 1].id
                    : undefined;
                await browseOneDriveItems(oneDriveSelectedDriveId, currentParentId);
              }, 'Folder refreshed.')
            }
            onSelectMasterWorkbook={(item) => {
              setOperationalDataForm((current) => {
                const next = {
                  ...current,
                  masterWorkbookName: item.name,
                  masterWorkbookUrl: item.webUrl ?? '',
                  masterDriveId: oneDriveSelectedDriveId,
                  masterItemId: item.id,
                  masterWorksheet: '',
                  relationshipMasterColumn: '',
                };
                persistOperationalWorkbookDraft(next);
                return next;
              });
              setWorkbookLoadRevision((current) => current + 1);
              setWorkbookValidation(null);
              setWorkbookHeaders(null);
              setMappingSuggestions(null);
              setConfigurationPreview(null);
              setSuccessMessage(`Master workbook selected: ${item.name}`);
            }}
            onSelectInventoryWorkbook={(item) => {
              setOperationalDataForm((current) => {
                const next = {
                  ...current,
                  inventoryWorkbookName: item.name,
                  inventoryWorkbookUrl: item.webUrl ?? '',
                  inventoryDriveId: oneDriveSelectedDriveId,
                  inventoryItemId: item.id,
                  inventoryWorksheet: '',
                  relationshipInventoryColumn: '',
                };
                persistOperationalWorkbookDraft(next);
                return next;
              });
              setWorkbookLoadRevision((current) => current + 1);
              setWorkbookValidation(null);
              setWorkbookHeaders(null);
              setMappingSuggestions(null);
              setConfigurationPreview(null);
              setSuccessMessage(`Inventory workbook selected: ${item.name}`);
            }}
            onLoadHeaders={() =>
              void runMutation(
                async () => {
                  const result = await operationalDataService.loadWorkbookHeaders({
                    ...getHeaderPayload(operationalDataForm),
                  });
                  setWorkbookHeaders(result);
                },
                'Workbook headers loaded successfully.',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
            onDetectMappings={() =>
              void runMutation(
                async () => {
                  if (!workbookHeaders) {
                    throw new Error('Load workbook headers before mapping detection.');
                  }
                  const result = await operationalDataService.detectMappings(
                    workbookHeaders.masterHeaders,
                    workbookHeaders.inventoryHeaders
                  );
                  setMappingSuggestions(result);
                  if (result.relationship) {
                    setOperationalDataForm((current) => ({
                      ...current,
                      relationshipMasterColumn:
                        result.relationship?.masterColumn ?? current.relationshipMasterColumn,
                      relationshipInventoryColumn:
                        result.relationship?.inventoryColumn ?? current.relationshipInventoryColumn,
                    }));
                  }
                },
                'Relationship and mappings detected successfully.',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
            onPreview={() =>
              void runMutation(
                async () => {
                  const result = await operationalDataService.previewConfiguration({
                    ...getWorkbookSourcePayload(operationalDataForm),
                    masterWorksheet: operationalDataForm.masterWorksheet,
                    inventoryWorksheet: operationalDataForm.inventoryWorksheet,
                    relationshipMasterColumn: operationalDataForm.relationshipMasterColumn,
                    relationshipInventoryColumn: operationalDataForm.relationshipInventoryColumn,
                    headerRow: 1,
                  });
                  setConfigurationPreview(result);
                },
                'Configuration preview generated successfully.',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
            onSave={() =>
              void runMutation(
                async () => {
                  if (wizardValidationMessages.length > 0) {
                    throw new Error(wizardValidationMessages[0]);
                  }
                  if (!workbookHeaders) {
                    throw new Error(
                      'Workbook headers are not loaded. Run Step 2: Load Headers before saving.'
                    );
                  }
                  if (workbookHeaders.masterHeaders.length === 0) {
                    throw new Error('Master worksheet headers are empty.');
                  }
                  if (workbookHeaders.inventoryHeaders.length === 0) {
                    throw new Error('Inventory worksheet headers are empty.');
                  }

                  const masterFallback = workbookHeaders.masterHeaders[0];
                  const inventoryFallback = workbookHeaders.inventoryHeaders[0];
                  const masterExisting = operationalDataSettings?.masterColumnMapping;
                  const inventoryExisting = operationalDataSettings?.inventoryColumnMapping;
                  const resolvedMasterMapping: MasterColumnMapping = {
                    customerName: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.customerName,
                      ['Customer Name', 'Customer', 'Name'],
                      masterFallback
                    ),
                    phone: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.phone,
                      ['Phone', 'Mobile', 'Contact Number', 'Phone Number'],
                      masterFallback
                    ),
                    hub: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.hub,
                      ['Hub', 'Location', 'Branch'],
                      masterFallback
                    ),
                    vehicleNumber: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.vehicleNumber,
                      ['Vehicle Number', 'Vehicle No', 'Vehicle'],
                      masterFallback
                    ),
                    mvTrackNumber: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.mvTrackNumber ?? operationalDataForm.relationshipMasterColumn,
                      ['MV Track Number', 'MV Track No', 'MV Track', 'MVTrackNumber'],
                      masterFallback
                    ),
                    plan: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.plan,
                      ['Plan'],
                      masterFallback
                    ),
                    rentalStatus: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.rentalStatus,
                      ['Rental Status', 'Status'],
                      masterFallback
                    ),
                    deploymentDate: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.deploymentDate,
                      ['Deployment Date', 'Deployment'],
                      masterFallback
                    ),
                    returnDate: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.returnDate,
                      ['Return Date', 'Returned Date'],
                      masterFallback
                    ),
                    coordinator: resolveHeader(
                      workbookHeaders.masterHeaders,
                      masterExisting?.coordinator,
                      ['Coordinator'],
                      masterFallback
                    ),
                  };
                  const resolvedInventoryMapping: InventoryColumnMapping = {
                    mvTrackNumber: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.mvTrackNumber ??
                        operationalDataForm.relationshipInventoryColumn,
                      ['MV Track Number', 'MV Track No', 'MV Track', 'MVTrackNumber'],
                      inventoryFallback
                    ),
                    vehicleNumber: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.vehicleNumber,
                      ['Vehicle Number', 'Vehicle No', 'Vehicle'],
                      inventoryFallback
                    ),
                    model: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.model,
                      ['Model'],
                      inventoryFallback
                    ),
                    modelCode: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.modelCode,
                      ['Model Code'],
                      inventoryFallback
                    ),
                    status: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.status,
                      ['Status', 'Rental Status'],
                      inventoryFallback
                    ),
                    hub: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.hub,
                      ['Hub', 'Location', 'Branch'],
                      inventoryFallback
                    ),
                    battery: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.battery,
                      ['Battery', 'Battery Number'],
                      inventoryFallback
                    ),
                    iotDevice: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.iotDevice,
                      ['IOT Device', 'IoT Device', 'Device'],
                      inventoryFallback
                    ),
                    vin: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.vin,
                      ['VIN'],
                      inventoryFallback
                    ),
                    motorNumber: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.motorNumber,
                      ['Motor Number', 'Motor No'],
                      inventoryFallback
                    ),
                    chassisNumber: resolveHeader(
                      workbookHeaders.inventoryHeaders,
                      inventoryExisting?.chassisNumber,
                      ['Chassis Number', 'Chassis No'],
                      inventoryFallback
                    ),
                  };

                  const updated = await operationalDataService.saveWizardConfiguration({
                    masterWorkbookUrl: operationalDataForm.masterWorkbookUrl || undefined,
                    inventoryWorkbookUrl: operationalDataForm.inventoryWorkbookUrl || undefined,
                    masterDriveId: operationalDataForm.masterDriveId || undefined,
                    masterItemId: operationalDataForm.masterItemId || undefined,
                    inventoryDriveId: operationalDataForm.inventoryDriveId || undefined,
                    inventoryItemId: operationalDataForm.inventoryItemId || undefined,
                    masterWorksheet: operationalDataForm.masterWorksheet,
                    inventoryWorksheet: operationalDataForm.inventoryWorksheet,
                    relationshipMasterColumn: operationalDataForm.relationshipMasterColumn,
                    relationshipInventoryColumn: operationalDataForm.relationshipInventoryColumn,
                    headerRow: 1,
                    autoDetectedMappings:
                      mappingSuggestions?.suggestions.reduce<Record<string, string>>(
                        (acc, item) => {
                          acc[item.sourceColumn] = item.targetColumn;
                          return acc;
                        },
                        {}
                      ) ?? {},
                    manualMappings: {},
                    masterColumnMapping: resolvedMasterMapping,
                    inventoryColumnMapping: resolvedInventoryMapping,
                    autoSyncEnabled: operationalDataForm.autoSyncEnabled,
                    syncFrequency: operationalDataForm.syncFrequency,
                  });
                  setOperationalDataSettings(updated);
                  setOperationalDataForm((current) => ({
                    ...current,
                    masterWorkbookName: updated.masterWorkbook ?? current.masterWorkbookName,
                    inventoryWorkbookName:
                      updated.inventoryWorkbook ?? current.inventoryWorkbookName,
                  }));
                  window.alert('Configuration saved successfully');
                },
                'Operational data configuration updated successfully.',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
            onRunSyncNow={() =>
              void runMutation(
                async () => {
                  if (wizardValidationMessages.length > 0) {
                    throw new Error('Fix configuration validation issues before running sync.');
                  }
                  const summary = await operationalDataService.runSyncNow();
                  setLatestSyncSummary(summary);
                  await refreshLatestSyncSummary();
                },
                'Synchronization triggered successfully.',
                {
                  reloadData: false,
                  reloadSelectedUser: false,
                }
              )
            }
          />
          <SystemSettingsPanel
            settings={settings}
            canEdit={canWrite}
            onValueChange={(settingKey, value) =>
              setSettings((current) =>
                current.map((setting) =>
                  setting.settingKey === settingKey ? { ...setting, value } : setting
                )
              )
            }
            onSave={() =>
              void runMutation(
                async () =>
                  adminService.updateSettings({
                    settings: settings.map((setting) => ({
                      settingKey: setting.settingKey,
                      category: setting.category,
                      value: setting.value,
                    })),
                  }),
                'Settings updated successfully.'
              )
            }
            saving={saving}
          />
        </div>
      )}

      {activeTab === 'servicePolicy' && <ServicePolicyPanel canEdit={canWrite} />}

      <AdminUserDetailsDrawer
        isOpen={isUserDrawerOpen}
        loading={loadingUserDetail}
        error={detailError}
        user={selectedUser}
        hubs={hubs}
        canEdit={canWrite}
        form={editUserForm}
        onFormChange={(updates) => setEditUserForm((current) => ({ ...current, ...updates }))}
        onRetry={() => {
          if (!selectedUserId) return;
          void loadSelectedUser(selectedUserId);
        }}
        onClose={() => setIsUserDrawerOpen(false)}
        onSave={() => {
          if (!selectedUserId) return;
          void runMutation(
            () => adminService.updateUser(selectedUserId, editUserForm),
            'User updated successfully.'
          );
        }}
        onActivate={() => {
          if (!selectedUserId) return;
          void runMutation(
            () => adminService.activateUser(selectedUserId),
            'User activated successfully.'
          );
        }}
        onDeactivate={() => {
          if (!selectedUserId) return;
          void runMutation(
            () => adminService.deactivateUser(selectedUserId),
            'User deactivated successfully.'
          );
        }}
        onDelete={() => {
          setDeleteUserConfirmInput('');
          setShowDeleteUserConfirm(true);
        }}
        saving={saving}
      />

      {selectedUser && (
        <Modal
          isOpen={showDeleteUserConfirm}
          onClose={() => setShowDeleteUserConfirm(false)}
          title="Delete User"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This deletes <strong>{selectedUser.name}</strong> ({selectedUser.email}) from every
              user list and blocks their login. Their historical records - assigned tickets, job
              cards, activity logs and approvals - are preserved and will continue to show their
              name. This action cannot be undone from this screen.
            </p>
            <div>
              <label
                className="mb-1 block text-xs font-medium text-gray-500"
                htmlFor="delete-user-confirm-input"
              >
                Type <strong>{selectedUser.email}</strong> to confirm
              </label>
              <Input
                id="delete-user-confirm-input"
                value={deleteUserConfirmInput}
                onChange={(event) => setDeleteUserConfirmInput(event.target.value)}
                placeholder={selectedUser.email}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteUserConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                loading={saving}
                disabled={deleteUserConfirmInput.trim() !== selectedUser.email}
                className="bg-danger text-white hover:bg-red-700"
                onClick={() => {
                  setShowDeleteUserConfirm(false);
                  void handleDeleteUser();
                }}
              >
                Delete User
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
