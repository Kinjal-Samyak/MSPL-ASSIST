import { useMemo, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Card, Input, Select } from '@/components/ui';
import type {
  ConfigurationPreviewResponse,
  GraphAuthStatusResponse,
  MappingSuggestionResponse,
  OneDriveDrive,
  OneDriveItem,
  OperationalDataSettings,
  SyncFrequency,
  WorkbookHeadersResponse,
  WorkbookValidationResponse,
} from '@/services/operationalDataService';

export interface WizardFormState {
  masterWorkbookName: string;
  masterWorkbookUrl: string;
  inventoryWorkbookName: string;
  inventoryWorkbookUrl: string;
  masterDriveId?: string;
  masterItemId?: string;
  inventoryDriveId?: string;
  inventoryItemId?: string;
  masterWorksheet: string;
  inventoryWorksheet: string;
  relationshipMasterColumn: string;
  relationshipInventoryColumn: string;
  autoSyncEnabled: boolean;
  syncFrequency: SyncFrequency;
}

interface Props {
  form: WizardFormState;
  canEdit: boolean;
  saving: boolean;
  settings: OperationalDataSettings | null;
  workbookValidation: WorkbookValidationResponse | null;
  graphAuthStatus: GraphAuthStatusResponse | null;
  headers: WorkbookHeadersResponse | null;
  mappingSuggestions: MappingSuggestionResponse | null;
  preview: ConfigurationPreviewResponse | null;
  validationMessages: string[];
  runSyncEnabled: boolean;
  syncSummary: {
    processed: number;
    matched: number;
    unmatched: number;
    errors: number;
    status: string;
    completedAt: string | null;
    operationalMetrics?: {
      masterDeploymentRowsRead: number;
      uniqueMotorNoFound: number;
      blankMasterMotorNo: number;
      duplicateMasterMotorNo: number;
      inventoryRows: number;
      distinctInventoryMotorNo: number;
      blankInventoryMotorNo: number;
      motorNoSuccessfullyMatched: number;
      missingMotorNo: number;
      duplicateInventoryMotorNo: number;
      snapshotsCreated: number;
    };
  } | null;
  onFormChange: (updates: Partial<WizardFormState>) => void;
  onValidateWorkbooks: () => void;
  onAuthenticateGraph: () => void;
  oneDriveLoading: boolean;
  oneDriveDrives: OneDriveDrive[];
  oneDriveItems: OneDriveItem[];
  selectedDriveId: string;
  canBrowseUp: boolean;
  oneDriveBreadcrumbs: string[];
  onSelectDrive: (driveId: string) => void;
  onLoadOneDriveDrives: () => void;
  onBrowseOneDriveRoot: () => void;
  onBrowseOneDriveFolder: (folderItemId: string) => void;
  onBrowseOneDriveBack: () => void;
  onBrowseOneDriveUp: () => void;
  onRefreshOneDriveCurrentFolder: () => void;
  onSelectMasterWorkbook: (item: OneDriveItem) => void;
  onSelectInventoryWorkbook: (item: OneDriveItem) => void;
  onLoadHeaders: () => void;
  onDetectMappings: () => void;
  onPreview: () => void;
  onSave: () => void;
  onRunSyncNow: () => void;
}

const frequencyOptions: Array<{ value: SyncFrequency; label: string }> = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'FIVE_MINUTES', label: 'Every 5 Minutes' },
  { value: 'FIFTEEN_MINUTES', label: 'Every 15 Minutes' },
  { value: 'THIRTY_MINUTES', label: 'Every 30 Minutes' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
];

function formatDateTime(value: string | null): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatFileSize(value: number | null): string {
  if (value == null || value < 0) return 'N/A';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function OperationalDataConfigurationPanel({
  form,
  canEdit,
  saving,
  settings,
  workbookValidation,
  graphAuthStatus,
  headers,
  mappingSuggestions,
  preview,
  validationMessages,
  runSyncEnabled,
  syncSummary,
  onFormChange,
  onValidateWorkbooks,
  onAuthenticateGraph,
  oneDriveLoading,
  oneDriveDrives,
  oneDriveItems,
  selectedDriveId,
  canBrowseUp,
  oneDriveBreadcrumbs,
  onSelectDrive,
  onLoadOneDriveDrives,
  onBrowseOneDriveRoot,
  onBrowseOneDriveFolder,
  onBrowseOneDriveBack,
  onBrowseOneDriveUp,
  onRefreshOneDriveCurrentFolder,
  onSelectMasterWorkbook,
  onSelectInventoryWorkbook,
  onLoadHeaders,
  onDetectMappings,
  onPreview,
  onSave,
  onRunSyncNow,
}: Props) {
  const [isOneDriveBrowserOpen, setIsOneDriveBrowserOpen] = useState(false);
  const [browserTarget, setBrowserTarget] = useState<'master' | 'inventory' | null>(null);
  const [selectedWorkbookItemId, setSelectedWorkbookItemId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const masterWorksheetOptions =
    workbookValidation?.masterWorkbook.worksheets.map((entry) => ({
      value: entry,
      label: entry,
    })) ?? [];
  const inventoryWorksheetOptions =
    workbookValidation?.inventoryWorkbook.worksheets.map((entry) => ({
      value: entry,
      label: entry,
    })) ?? [];
  const relationshipMasterOptions =
    headers?.masterHeaders.map((entry) => ({ value: entry, label: entry })) ?? [];
  const relationshipInventoryOptions =
    headers?.inventoryHeaders.map((entry) => ({ value: entry, label: entry })) ?? [];
  const driveOptions = oneDriveDrives.map((entry) => ({
    value: entry.id,
    label: `${entry.name} (${entry.driveType})`,
  }));
  const folderItems = oneDriveItems.filter((entry) => entry.type === 'FOLDER');
  const workbookItems = oneDriveItems.filter((entry) => entry.type === 'WORKBOOK');
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return oneDriveItems;
    return oneDriveItems.filter((entry) => entry.name.toLowerCase().includes(term));
  }, [oneDriveItems, searchTerm]);
  const selectedWorkbook =
    workbookItems.find((entry) => entry.id === selectedWorkbookItemId) ?? null;
  const openBrowser = (target: 'master' | 'inventory') => {
    setBrowserTarget(target);
    setSelectedWorkbookItemId('');
    setSearchTerm('');
    setIsOneDriveBrowserOpen(true);
    if (oneDriveItems.length === 0 && !canBrowseUp) {
      onBrowseOneDriveRoot();
    }
  };

  const closeBrowser = () => {
    setIsOneDriveBrowserOpen(false);
    setBrowserTarget(null);
    setSelectedWorkbookItemId('');
    setSearchTerm('');
  };

  const handleSelectWorkbook = () => {
    if (!selectedWorkbook) return;
    if (browserTarget === 'master') {
      onSelectMasterWorkbook(selectedWorkbook);
    } else if (browserTarget === 'inventory') {
      onSelectInventoryWorkbook(selectedWorkbook);
    }
    closeBrowser();
  };

  return (
    <div className="space-y-4">
      <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Operational Data Workbook Configuration Wizard
        </h3>
        <div className="mt-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            OneDrive Browser (No URL Pasting Required)
          </h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="OneDrive"
              value={selectedDriveId}
              options={driveOptions}
              onChange={(event) => onSelectDrive(event.target.value)}
              disabled={!canEdit || oneDriveLoading}
              placeholder="Select OneDrive"
            />
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={onLoadOneDriveDrives}
                disabled={!canEdit}
                loading={oneDriveLoading}
              >
                Refresh Drives
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Master Workbook"
            value={form.masterWorkbookName}
            onChange={(event) => onFormChange({ masterWorkbookUrl: event.target.value })}
            disabled
            hint="Select the master workbook from OneDrive"
            placeholder="No file selected"
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => openBrowser('master')}
              disabled={!canEdit || !selectedDriveId}
            >
              Browse OneDrive
            </Button>
          </div>
          <Input
            label="Inventory Workbook"
            value={form.inventoryWorkbookName}
            onChange={(event) => onFormChange({ inventoryWorkbookUrl: event.target.value })}
            disabled
            hint="Select the inventory workbook from OneDrive"
            placeholder="No file selected"
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => openBrowser('inventory')}
              disabled={!canEdit || !selectedDriveId}
            >
              Browse OneDrive
            </Button>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button
              variant="outline"
              onClick={onAuthenticateGraph}
              disabled={!canEdit}
              loading={saving}
            >
              Step 0: Authenticate Microsoft 365
            </Button>
            <Button
              variant="outline"
              onClick={onValidateWorkbooks}
              disabled={!canEdit}
              loading={saving}
            >
              Step 1: Validate Workbooks
            </Button>
            <Button variant="outline" onClick={onLoadHeaders} disabled={!canEdit} loading={saving}>
              Step 2: Load Headers
            </Button>
            <Button
              variant="outline"
              onClick={onDetectMappings}
              disabled={!canEdit}
              loading={saving}
            >
              Step 3: Detect Relationship & Mappings
            </Button>
            <Button variant="outline" onClick={onPreview} disabled={!canEdit} loading={saving}>
              Step 4: Preview
            </Button>
          </div>
          {graphAuthStatus && (
            <div className="md:col-span-2 rounded-md border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
              <div>
                Authenticated:{' '}
                <span className="font-medium">{graphAuthStatus.authenticated ? 'Yes' : 'No'}</span>
              </div>
              <div>Token Expires: {formatDateTime(graphAuthStatus.expiresAt)}</div>
              <div>Last Auth Update: {formatDateTime(graphAuthStatus.updatedAt)}</div>
              {graphAuthStatus.lastError ? <div>Error: {graphAuthStatus.lastError}</div> : null}
            </div>
          )}

          <Select
            label="Master Worksheet"
            value={form.masterWorksheet}
            options={masterWorksheetOptions}
            onChange={(event) => onFormChange({ masterWorksheet: event.target.value })}
            disabled={!canEdit}
            placeholder="Select worksheet"
          />
          <Select
            label="Inventory Worksheet"
            value={form.inventoryWorksheet}
            options={inventoryWorksheetOptions}
            onChange={(event) => onFormChange({ inventoryWorksheet: event.target.value })}
            disabled={!canEdit}
            placeholder="Select worksheet"
          />

          <Select
            label="Relationship Master Column"
            value={form.relationshipMasterColumn}
            options={relationshipMasterOptions}
            onChange={(event) => onFormChange({ relationshipMasterColumn: event.target.value })}
            disabled={!canEdit}
            placeholder="Select column"
          />
          <Select
            label="Relationship Inventory Column"
            value={form.relationshipInventoryColumn}
            options={relationshipInventoryOptions}
            onChange={(event) => onFormChange({ relationshipInventoryColumn: event.target.value })}
            disabled={!canEdit}
            placeholder="Select column"
          />

          <Select
            label="Sync Frequency"
            value={form.syncFrequency}
            onChange={(event) =>
              onFormChange({ syncFrequency: event.target.value as SyncFrequency })
            }
            options={frequencyOptions}
            disabled={!canEdit}
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.autoSyncEnabled}
              onChange={(event) => onFormChange({ autoSyncEnabled: event.target.checked })}
              disabled={!canEdit}
            />
            <span>Auto Sync Enabled</span>
          </label>
        </div>

        {mappingSuggestions && (
          <div className="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Auto-Detected Relationship
            </h4>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {mappingSuggestions.relationship
                ? `${mappingSuggestions.relationship.masterColumn} -> ${mappingSuggestions.relationship.inventoryColumn} (${mappingSuggestions.relationship.confidence.toFixed(2)}%)`
                : 'No high-confidence relationship detected. Please select manually.'}
            </p>
          </div>
        )}

        {validationMessages.length > 0 && (
          <div className="mt-4 rounded-md border border-warning/20 bg-warning/10 p-3 dark:border-amber-900/60 dark:bg-amber-900/20">
            <h4 className="text-sm font-semibold text-warning dark:text-amber-300">
              Configuration Validation
            </h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warning dark:text-amber-300">
              {validationMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {preview && (
          <div className="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Preview Configuration
            </h4>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
              <div>Master Rows: {preview.masterRows}</div>
              <div>Inventory Rows: {preview.inventoryRows}</div>
              <div>Matched Records: {preview.matchedRecordsEstimate}</div>
              <div>Missing Master Keys: {preview.missingMasterKeys}</div>
              <div>Missing Inventory Keys: {preview.missingInventoryKeys}</div>
              <div>Duplicate Master Keys: {preview.duplicateMasterKeys}</div>
              <div>Duplicate Inventory Keys: {preview.duplicateInventoryKeys}</div>
              <div>Rows Read: {preview.rowsRead}</div>
              <div>Rows Valid: {preview.rowsValid}</div>
              <div>Rows Invalid: {preview.rowsInvalid}</div>
              <div>Rows Insert: {preview.rowsInsert}</div>
              <div>Rows Update: {preview.rowsUpdate}</div>
              <div>Rows Ignore: {preview.rowsIgnore}</div>
              <div>Relationship Failures: {preview.relationshipFailures}</div>
              <div>Validation Errors: {preview.validationErrors}</div>
              <div>Mapping Errors: {preview.columnMappingErrors}</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={!canEdit} loading={saving}>
            Step 5: Save Configuration
          </Button>
          <Button
            variant="outline"
            onClick={onRunSyncNow}
            loading={saving}
            disabled={!runSyncEnabled}
          >
            Run Sync Now
          </Button>
        </div>

        {!runSyncEnabled && (
          <p className="mt-2 text-sm text-warning dark:text-amber-300">
            Complete workbook, worksheet, and relationship column validation before running sync.
          </p>
        )}

        {syncSummary && (
          <div className="mt-4 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Latest Sync Summary</h4>
            <div className="mt-2 grid grid-cols-1 gap-2 text-gray-700 dark:text-gray-300 md:grid-cols-2">
              <div>Status: {syncSummary.status}</div>
              <div>Completed: {formatDateTime(syncSummary.completedAt)}</div>
              {syncSummary.operationalMetrics && (
                <>
                  <div>
                    Master Deployment Rows Read:{' '}
                    {syncSummary.operationalMetrics.masterDeploymentRowsRead}
                  </div>
                  <div>
                    Unique MotorNo. Found: {syncSummary.operationalMetrics.uniqueMotorNoFound}
                  </div>
                  <div>
                    Blank Master MotorNo.: {syncSummary.operationalMetrics.blankMasterMotorNo}
                  </div>
                  <div>
                    Duplicate Master MotorNo.:{' '}
                    {syncSummary.operationalMetrics.duplicateMasterMotorNo}
                  </div>
                  <div>Inventory Rows: {syncSummary.operationalMetrics.inventoryRows}</div>
                  <div>
                    Distinct Inventory MotorNo.:{' '}
                    {syncSummary.operationalMetrics.distinctInventoryMotorNo}
                  </div>
                  <div>
                    Blank Inventory MotorNo.: {syncSummary.operationalMetrics.blankInventoryMotorNo}
                  </div>
                  <div>
                    MotorNo. Successfully Matched:{' '}
                    {syncSummary.operationalMetrics.motorNoSuccessfullyMatched}
                  </div>
                  <div>Missing MotorNo.: {syncSummary.operationalMetrics.missingMotorNo}</div>
                  <div>
                    Duplicate Inventory MotorNo.:{' '}
                    {syncSummary.operationalMetrics.duplicateInventoryMotorNo}
                  </div>
                  <div>Snapshots Created: {syncSummary.operationalMetrics.snapshotsCreated}</div>
                </>
              )}
              <div>Errors: {syncSummary.errors}</div>
            </div>
          </div>
        )}
      </Card>

      <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Configuration Status
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-2">
          <div>Last Sync: {formatDateTime(settings?.lastSyncTime ?? null)}</div>
          <div>Last Successful Sync: {formatDateTime(settings?.lastSuccessfulSync ?? null)}</div>
          <div>Last Validation: {formatDateTime(settings?.lastValidation ?? null)}</div>
          <div>Status: {settings?.lastSyncStatus ?? 'N/A'}</div>
          <div>Rows Imported: {settings?.lastSyncRowsImported ?? 0}</div>
          <div>Rows Updated: {settings?.lastSyncRowsUpdated ?? 0}</div>
          <div>Rows Failed: {settings?.lastSyncRowsFailed ?? 0}</div>
          <div>Duration (ms): {settings?.lastSyncDuration ?? 'N/A'}</div>
        </div>
      </Card>

      <Modal
        isOpen={isOneDriveBrowserOpen}
        onClose={closeBrowser}
        title={`Browse OneDrive — ${browserTarget === 'master' ? 'Master Workbook' : 'Inventory Workbook'}`}
        size="2xl"
      >
        <div className="space-y-4" style={{ height: '80vh' }}>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Search current folder"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by file/folder name"
            />
            <Button
              variant="outline"
              onClick={onBrowseOneDriveRoot}
              disabled={!canEdit || !selectedDriveId}
              loading={oneDriveLoading}
            >
              Home
            </Button>
            <Button
              variant="outline"
              onClick={onBrowseOneDriveBack}
              disabled={!canEdit || !selectedDriveId || !canBrowseUp}
              loading={oneDriveLoading}
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={onBrowseOneDriveUp}
              disabled={!canEdit || !selectedDriveId || !canBrowseUp}
              loading={oneDriveLoading}
            >
              Up
            </Button>
            <Button
              variant="outline"
              onClick={onRefreshOneDriveCurrentFolder}
              disabled={!canEdit || !selectedDriveId}
              loading={oneDriveLoading}
            >
              Refresh
            </Button>
            <Button onClick={handleSelectWorkbook} disabled={!selectedWorkbook || !canEdit}>
              Select
            </Button>
          </div>

          <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Breadcrumb
            </div>
            <div className="mt-1 break-words font-medium">{oneDriveBreadcrumbs.join(' / ')}</div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-h-0 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Folder Tree
              </h5>
              <div className="mt-2 max-h-[52vh] space-y-1 overflow-auto">
                {folderItems.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No subfolders in current location.
                  </p>
                ) : (
                  folderItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      onClick={() => onBrowseOneDriveFolder(item.id)}
                    >
                      📁 {item.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="min-h-0 md:col-span-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Folder Contents
              </h5>
              {oneDriveLoading ? (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading folder contents...
                </p>
              ) : filteredItems.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This folder is empty or no items match your search.
                </p>
              ) : (
                <div className="mt-2 max-h-[52vh] overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Modified</th>
                        <th className="px-3 py-2 text-left font-medium">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const isSelected = selectedWorkbookItemId === item.id;
                        return (
                          <tr
                            key={item.id}
                            className={`border-t border-gray-200 dark:border-gray-800 ${
                              isSelected ? 'bg-success/10 dark:bg-emerald-900/20' : ''
                            }`}
                            onClick={() => {
                              if (item.type === 'WORKBOOK') {
                                setSelectedWorkbookItemId(item.id);
                              }
                            }}
                            onDoubleClick={() => {
                              if (item.type === 'FOLDER') {
                                onBrowseOneDriveFolder(item.id);
                              }
                            }}
                          >
                            <td className="px-3 py-2">
                              <span className="font-medium">
                                {item.type === 'FOLDER' ? '📁' : '📄'} {item.name}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {formatDateTime(item.lastModifiedDate)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {item.type === 'FOLDER' ? '-' : formatFileSize(item.size)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Selected
            </div>
            <div className="mt-1 font-medium text-gray-800 dark:text-gray-200">
              {selectedWorkbook ? selectedWorkbook.name : 'No workbook selected'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeBrowser}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
