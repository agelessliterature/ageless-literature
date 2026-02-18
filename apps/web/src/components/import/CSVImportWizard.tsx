'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';

// ─── Types ───
interface TargetField {
  key: string;
  label: string;
  required: boolean;
  type: string;
  options?: string[];
  default?: any;
}

interface RowData {
  _rowIndex: number;
  _errors?: { field: string; message: string }[];
  [key: string]: any;
}

interface ImportStats {
  totalRows: number;
  totalParsed: number;
  validRows: number;
  invalidRows: number;
  truncated: boolean;
}

interface StageResult {
  importId: string;
  csvHeaders: string[];
  suggestedMappings: Record<string, string | null>;
  stats: ImportStats;
  validationErrors: { rowIndex: number; errors: { field: string; message: string }[] }[];
  previewRows: RowData[];
  targetFields: TargetField[];
}

interface CommitResult {
  importId: string;
  status: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  totalProcessed: number;
  failures: { rowIndex: number; title: string; error: string }[];
}

interface CSVImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  role: 'vendor' | 'admin';
  vendorId?: number;
}

type Step = 'upload' | 'mapping' | 'validation' | 'preview' | 'confirm' | 'results';

const STEPS: { key: Step; label: string; icon: [string, string] }[] = [
  { key: 'upload', label: 'Upload', icon: ['fal', 'cloud-upload'] },
  { key: 'mapping', label: 'Map Columns', icon: ['fal', 'columns'] },
  { key: 'validation', label: 'Validate', icon: ['fal', 'check-circle'] },
  { key: 'preview', label: 'Preview', icon: ['fal', 'eye'] },
  { key: 'confirm', label: 'Confirm', icon: ['fal', 'paper-plane'] },
  { key: 'results', label: 'Results', icon: ['fal', 'chart-bar'] },
];

export default function CSVImportWizard({
  isOpen,
  onClose,
  onComplete,
  role,
  vendorId,
}: CSVImportWizardProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Stage data
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [rows, setRows] = useState<RowData[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [rowFilter, setRowFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const rowPageRef = useRef(1);
  const [showUnmappedCols, setShowUnmappedCols] = useState(false);

  // Inline row editor
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Commit options
  const [importMode, setImportMode] = useState<'create' | 'update' | 'upsert'>('create');
  const [matchStrategy, setMatchStrategy] = useState('none');
  const [defaultStatus, setDefaultStatus] = useState('draft');
  const [adminVendorId, setAdminVendorId] = useState(vendorId?.toString() || '');

  // Results
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // Vendor list (admin only)
  const [vendors, setVendors] = useState<{ id: string; shopName: string }[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const apiBase = role === 'vendor' ? 'api/vendor/imports/books' : 'api/admin/imports/books';

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${session?.accessToken}`,
    }),
    [session?.accessToken],
  );

  // Fetch vendor list for admin role
  useEffect(() => {
    if (role !== 'admin' || !session?.accessToken || !isOpen) return;
    setVendorsLoading(true);
    fetch(getApiUrl('api/admin/vendors?page=1&limit=1000'), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const list = data.data?.vendors || data.data || [];
          setVendors(list);
          // Pre-select first vendor if none chosen
          if (!adminVendorId && list.length > 0) {
            setAdminVendorId(String(list[0].id));
          }
        }
      })
      .catch(console.error)
      .finally(() => setVendorsLoading(false));
  }, [role, session?.accessToken, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Upload Step ───
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setLoading(true);
      setError('');
      setFileName(file.name);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (role === 'admin' && adminVendorId) {
          formData.append('vendorId', adminVendorId);
        }

        const res = await fetch(getApiUrl(`${apiBase}/stage`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.accessToken}` },
          body: formData,
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setStageResult(data.data);
        // Strip 'sku' from suggestions — book IDs are managed by the DB
        const cleaned: Record<string, string | null> = {};
        for (const [col, target] of Object.entries(
          data.data.suggestedMappings as Record<string, string | null>,
        )) {
          cleaned[col] = target === 'sku' ? null : target;
        }
        setMappings(cleaned);
        setRows(data.data.previewRows);
        setStats(data.data.stats);
        setStep('mapping');
      } catch (err: any) {
        setError(err.message || 'Failed to upload CSV');
      } finally {
        setLoading(false);
      }
    },
    [apiBase, role, adminVendorId, session?.accessToken],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ─── Mapping Step ───
  const handleMappingChange = (csvCol: string, targetKey: string | null) => {
    setMappings((prev) => ({ ...prev, [csvCol]: targetKey }));
  };

  const applyMappings = async () => {
    if (!stageResult) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl(`${apiBase}/remap`), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId: stageResult.importId, mappings }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setRows(data.data.previewRows);
      setStats(data.data.stats);
      setStep('validation');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Load rows with filter/pagination ───
  const loadRows = async (page: number, filter: 'all' | 'valid' | 'invalid') => {
    if (!stageResult) return;
    try {
      const res = await fetch(
        getApiUrl(`${apiBase}/${stageResult.importId}/rows?page=${page}&limit=50&filter=${filter}`),
        { headers },
      );
      const data = await res.json();
      if (data.success) {
        setRows(data.data.rows);
        rowPageRef.current = page;
        setRowFilter(filter);
      }
    } catch (err) {
      console.error('Failed to load rows:', err);
    }
  };

  // ─── Load valid rows for Preview step ───
  const loadValidRows = async () => {
    if (!stageResult) return;
    try {
      const res = await fetch(
        getApiUrl(`${apiBase}/${stageResult.importId}/rows?page=1&limit=100&filter=valid`),
        { headers },
      );
      const data = await res.json();
      if (data.success) {
        setRows(data.data.rows);
        setSelectedRow(null);
      }
    } catch (err) {
      console.error('Failed to load valid rows for preview:', err);
    }
  };

  // ─── Inline row edit ───
  const openRowEditor = (row: RowData) => {
    setEditingRowIndex(row._rowIndex);
    // Seed draft with a copy of every non-private field
    const draft: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!k.startsWith('_')) draft[k] = v ?? '';
    }
    setEditDraft(draft);
  };

  const closeRowEditor = () => {
    setEditingRowIndex(null);
    setEditDraft({});
  };

  const saveRowEdit = async () => {
    if (!stageResult || editingRowIndex === null) return;
    setEditSaving(true);
    try {
      const res = await fetch(
        getApiUrl(`${apiBase}/${stageResult.importId}/rows/${editingRowIndex}`),
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(editDraft),
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Patch local state
      const updated: RowData = data.data.row;
      setRows((prev) => prev.map((r) => (r._rowIndex === editingRowIndex ? updated : r)));
      setStats(data.data.stats);
      closeRowEditor();
    } catch (err: any) {
      setError(err.message || 'Failed to save row');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Commit ───
  const handleCommit = async () => {
    if (!stageResult) return;
    setLoading(true);
    setError('');
    try {
      const body: any = {
        importId: stageResult.importId,
        mode: importMode,
        matchStrategy,
        defaultStatus,
      };
      if (role === 'admin') body.vendorId = adminVendorId;

      const res = await fetch(getApiUrl(`${apiBase}/commit`), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCommitResult(data.data);
      setStep('results');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Download error CSV ───
  const downloadErrors = async () => {
    if (!stageResult) return;
    window.open(getApiUrl(`${apiBase}/${stageResult.importId}/errors-csv`), '_blank');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Books from CSV</h2>
            {fileName && <p className="text-sm text-gray-500 mt-0.5">{fileName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    i === currentStepIndex
                      ? 'bg-primary text-white'
                      : i < currentStepIndex
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < currentStepIndex ? (
                    <FontAwesomeIcon icon={['fal', 'check']} className="text-xs" />
                  ) : (
                    <FontAwesomeIcon icon={s.icon as any} className="text-xs" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 h-0.5 mx-1 ${i < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2 text-red-700 text-sm">
              <FontAwesomeIcon icon={['fal', 'exclamation-circle']} />
              {error}
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <FontAwesomeIcon icon={['fal', 'times']} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* ═══ UPLOAD STEP ═══ */}
          {step === 'upload' && (
            <div className="max-w-xl mx-auto py-8">
              {role === 'admin' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  {vendorsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <FontAwesomeIcon icon={['fal', 'spinner']} spin />
                      Loading vendors...
                    </div>
                  ) : (
                    <select
                      value={adminVendorId}
                      onChange={(e) => setAdminVendorId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">-- Select a vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={String(v.id)}>
                          {v.shopName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                    <p className="text-gray-600">Parsing CSV file...</p>
                  </div>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={['fal', 'cloud-upload-alt']}
                      className="text-4xl text-gray-400 mb-4"
                    />
                    <p className="text-lg font-medium text-gray-700">
                      Drop your CSV file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports up to 5,000 rows. Max file size: 10MB
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ═══ MAPPING STEP ═══ */}
          {step === 'mapping' && stageResult && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Column Mapping</h3>
                  <p className="text-sm text-gray-500">
                    We auto-detected mappings. Adjust as needed. Required fields are marked with *.
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {stageResult.csvHeaders.length} CSV columns detected
                </div>
              </div>

              {(() => {
                // Columns to always hide entirely
                const hiddenCols = new Set(['book_id', 'sku']);
                // Columns with a recognised auto-mapping
                const mappedCols = stageResult.csvHeaders.filter(
                  (col) => !hiddenCols.has(col) && mappings[col] != null,
                );
                // Columns with no auto-mapping (can be shown on demand)
                const unmappedCols = stageResult.csvHeaders.filter(
                  (col) => !hiddenCols.has(col) && mappings[col] == null,
                );

                const renderRow = (col: string) => (
                  <div key={col} className="flex items-center gap-4 bg-gray-50 p-3 rounded border">
                    <div className="w-1/3 truncate font-mono text-sm text-gray-700" title={col}>
                      {col}
                    </div>
                    <FontAwesomeIcon
                      icon={['fal', 'arrow-right']}
                      className="text-gray-400 flex-shrink-0"
                    />
                    <select
                      value={mappings[col] || '__ignore__'}
                      onChange={(e) =>
                        handleMappingChange(
                          col,
                          e.target.value === '__ignore__' ? null : e.target.value,
                        )
                      }
                      className={`flex-1 px-3 py-2 border rounded text-sm ${
                        mappings[col] ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="__ignore__">-- Ignore this column --</option>
                      {stageResult.targetFields
                        .filter((tf) => tf.key !== 'sku')
                        .map((tf) => (
                          <option key={tf.key} value={tf.key}>
                            {tf.label} {tf.required ? '*' : ''}
                          </option>
                        ))}
                    </select>
                    {mappings[col] && (
                      <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-green-500" />
                    )}
                  </div>
                );

                return (
                  <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
                    {mappedCols.map(renderRow)}

                    {unmappedCols.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowUnmappedCols((v) => !v)}
                          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 py-1 transition mt-1"
                        >
                          <FontAwesomeIcon
                            icon={['fal', showUnmappedCols ? 'chevron-up' : 'chevron-down']}
                          />
                          {showUnmappedCols ? 'Hide' : 'Show'} {unmappedCols.length} unrecognized
                          column{unmappedCols.length !== 1 ? 's' : ''} not on the book form
                        </button>
                        {showUnmappedCols && unmappedCols.map(renderRow)}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Required fields warning */}
              {(() => {
                const mapped = new Set(Object.values(mappings).filter(Boolean));
                const missing = stageResult.targetFields.filter(
                  (f) => f.required && !mapped.has(f.key),
                );
                if (missing.length === 0) return null;
                return (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <FontAwesomeIcon
                      icon={['fal', 'exclamation-triangle']}
                      className="text-yellow-600 mr-2"
                    />
                    <span className="text-yellow-700">
                      Missing required fields: {missing.map((f) => f.label).join(', ')}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ VALIDATION STEP ═══ */}
          {step === 'validation' && stats && (
            <div>
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">Validation Results</h3>
                  <p className="text-sm text-gray-500">
                    {stats.validRows} valid, {stats.invalidRows} invalid out of {stats.totalRows}{' '}
                    rows
                  </p>
                </div>
                <div className="flex gap-2">
                  {(['all', 'valid', 'invalid'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => loadRows(1, f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                        rowFilter === f
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all'
                        ? `All (${stats.totalRows})`
                        : f === 'valid'
                          ? `Valid (${stats.validRows})`
                          : `Invalid (${stats.invalidRows})`}
                    </button>
                  ))}
                  {stats.invalidRows > 0 && (
                    <button
                      onClick={downloadErrors}
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                    >
                      <FontAwesomeIcon icon={['fal', 'download']} className="mr-1" />
                      Error CSV
                    </button>
                  )}
                </div>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{stats.totalRows}</div>
                  <div className="text-xs text-blue-600">Total Rows</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{stats.validRows}</div>
                  <div className="text-xs text-green-600">Valid</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{stats.invalidRows}</div>
                  <div className="text-xs text-red-600">Invalid</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700">
                    {stats.totalRows > 0
                      ? Math.round((stats.validRows / stats.totalRows) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
              </div>

              {/* Rows table + inline editor */}
              <div className="border rounded overflow-hidden">
                <div className="overflow-x-auto max-h-[45vh] overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          Title
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          Author
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          Price
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          Errors / Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((row) => {
                        const isInvalid = row._errors && row._errors.length > 0;
                        const isEditing = editingRowIndex === row._rowIndex;

                        // All mapped target fields for the editor
                        const editableFields = stageResult
                          ? stageResult.targetFields.filter(
                              (tf) => tf.key !== 'sku' && Object.values(mappings).includes(tf.key),
                            )
                          : [];

                        return (
                          <>
                            <tr
                              key={row._rowIndex}
                              className={`${isInvalid ? 'bg-red-50/40' : ''} ${
                                isEditing
                                  ? 'ring-2 ring-primary ring-inset bg-primary/5'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-500">{row._rowIndex}</td>
                              <td className="px-3 py-2 font-medium truncate max-w-[200px]">
                                {row.title || '—'}
                              </td>
                              <td className="px-3 py-2 truncate max-w-[150px]">
                                {row.author || '—'}
                              </td>
                              <td className="px-3 py-2">
                                {row.price != null ? `$${Number(row.price).toFixed(2)}` : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {isInvalid ? (
                                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                    Invalid
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                    Valid
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {isInvalid ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-red-600">
                                      {row._errors!.map((e) => e.message).join(', ')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        isEditing ? closeRowEditor() : openRowEditor(row)
                                      }
                                      className="flex-shrink-0 px-2 py-0.5 text-xs bg-primary text-white rounded hover:bg-opacity-90 transition"
                                    >
                                      {isEditing ? 'Cancel' : 'Fix'}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </tr>

                            {/* Inline editor row */}
                            {isEditing && (
                              <tr key={`edit-${row._rowIndex}`}>
                                <td colSpan={6} className="p-0">
                                  <div className="bg-blue-50 border-t border-b border-blue-200 px-4 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-semibold text-gray-800">
                                        Edit Row {row._rowIndex}
                                      </h4>
                                      {/* Show current errors */}
                                      <div className="flex flex-wrap gap-1">
                                        {row._errors!.map((e, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full"
                                          >
                                            {e.field}: {e.message}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Field grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                      {editableFields.map((tf) => {
                                        const hasError = row._errors?.some(
                                          (e) => e.field === tf.key,
                                        );
                                        return (
                                          <div key={tf.key}>
                                            <label
                                              className={`block text-xs font-medium mb-1 ${hasError ? 'text-red-600' : 'text-gray-600'}`}
                                            >
                                              {tf.label}
                                              {tf.required && (
                                                <span className="text-red-500 ml-0.5">*</span>
                                              )}
                                            </label>
                                            {tf.options && tf.options.length > 0 ? (
                                              <select
                                                value={editDraft[tf.key] ?? ''}
                                                onChange={(e) =>
                                                  setEditDraft((d) => ({
                                                    ...d,
                                                    [tf.key]: e.target.value,
                                                  }))
                                                }
                                                className={`w-full px-2 py-1.5 text-sm border rounded ${
                                                  hasError
                                                    ? 'border-red-400 bg-red-50'
                                                    : 'border-gray-300 bg-white'
                                                }`}
                                              >
                                                <option value="">-- Select --</option>
                                                {tf.options.map((opt) => (
                                                  <option key={opt} value={opt}>
                                                    {opt}
                                                  </option>
                                                ))}
                                              </select>
                                            ) : tf.type === 'number' ? (
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={editDraft[tf.key] ?? ''}
                                                onChange={(e) =>
                                                  setEditDraft((d) => ({
                                                    ...d,
                                                    [tf.key]: e.target.value,
                                                  }))
                                                }
                                                className={`w-full px-2 py-1.5 text-sm border rounded ${
                                                  hasError
                                                    ? 'border-red-400 bg-red-50'
                                                    : 'border-gray-300 bg-white'
                                                }`}
                                              />
                                            ) : tf.type === 'boolean' ? (
                                              <select
                                                value={
                                                  editDraft[tf.key] === true ||
                                                  editDraft[tf.key] === 'true'
                                                    ? 'true'
                                                    : 'false'
                                                }
                                                onChange={(e) =>
                                                  setEditDraft((d) => ({
                                                    ...d,
                                                    [tf.key]: e.target.value === 'true',
                                                  }))
                                                }
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                                              >
                                                <option value="false">No</option>
                                                <option value="true">Yes</option>
                                              </select>
                                            ) : (
                                              <input
                                                type="text"
                                                value={editDraft[tf.key] ?? ''}
                                                onChange={(e) =>
                                                  setEditDraft((d) => ({
                                                    ...d,
                                                    [tf.key]: e.target.value,
                                                  }))
                                                }
                                                className={`w-full px-2 py-1.5 text-sm border rounded ${
                                                  hasError
                                                    ? 'border-red-400 bg-red-50'
                                                    : 'border-gray-300 bg-white'
                                                }`}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={closeRowEditor}
                                        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={saveRowEdit}
                                        disabled={editSaving}
                                        className="px-4 py-1.5 text-sm bg-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50 transition flex items-center gap-1.5"
                                      >
                                        {editSaving ? (
                                          <>
                                            <div className="w-3 h-3 border-b-2 border-white rounded-full animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <FontAwesomeIcon icon={['fal', 'save']} />
                                            Save Row
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PREVIEW STEP ═══ */}
          {step === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Row selector */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Valid rows ({rows.filter((r) => !r._errors || r._errors.length === 0).length})
                </h3>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {rows.filter((r) => !r._errors || r._errors.length === 0).length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FontAwesomeIcon icon={['fal', 'spinner']} spin className="text-2xl mb-2" />
                      <p className="text-sm">Loading valid rows...</p>
                    </div>
                  ) : (
                    rows
                      .filter((r) => !r._errors || r._errors.length === 0)
                      .slice(0, 100)
                      .map((row) => (
                        <div
                          key={row._rowIndex}
                          onClick={() => setSelectedRow(row)}
                          className={`p-3 border rounded cursor-pointer transition ${
                            selectedRow?._rowIndex === row._rowIndex
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm truncate">{row.title}</div>
                          <div className="text-xs text-gray-500">
                            {row.author} · ${Number(row.price || 0).toFixed(2)}
                            {row.sku ? ` · ID: ${row.sku}` : ''}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Product detail preview */}
              <div className="border rounded-lg overflow-hidden">
                {selectedRow ? (
                  <div className="p-6">
                    {/* Image preview */}
                    {selectedRow.images && selectedRow.images.length > 0 ? (
                      <div className="mb-4">
                        <img
                          src={selectedRow.images[0]}
                          alt={selectedRow.title}
                          className="w-full max-h-64 object-contain bg-gray-50 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        {selectedRow.images.length > 1 && (
                          <div className="flex gap-2 mt-2">
                            {selectedRow.images.slice(1, 5).map((img: string, i: number) => (
                              <img
                                key={i}
                                src={img}
                                alt=""
                                className="w-16 h-16 object-cover rounded border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4 h-48 bg-gray-100 rounded flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={['fal', 'image']}
                          className="text-4xl text-gray-300"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900">{selectedRow.title}</h3>
                    <p className="text-gray-600 mt-1">{selectedRow.author}</p>
                    <div className="mt-3 text-2xl font-bold text-primary">
                      ${Number(selectedRow.price || 0).toFixed(2)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      {selectedRow.condition && (
                        <div>
                          <span className="text-gray-500">Condition:</span>{' '}
                          <span className="font-medium capitalize">{selectedRow.condition}</span>
                        </div>
                      )}
                      {selectedRow.isbn && (
                        <div>
                          <span className="text-gray-500">ISBN:</span>{' '}
                          <span className="font-medium">{selectedRow.isbn}</span>
                        </div>
                      )}
                      {selectedRow.publisher && (
                        <div>
                          <span className="text-gray-500">Publisher:</span>{' '}
                          <span className="font-medium">{selectedRow.publisher}</span>
                        </div>
                      )}
                      {selectedRow.publicationYear && (
                        <div>
                          <span className="text-gray-500">Year:</span>{' '}
                          <span className="font-medium">{selectedRow.publicationYear}</span>
                        </div>
                      )}
                      {selectedRow.edition && (
                        <div>
                          <span className="text-gray-500">Edition:</span>{' '}
                          <span className="font-medium">{selectedRow.edition}</span>
                        </div>
                      )}
                      {selectedRow.binding && (
                        <div>
                          <span className="text-gray-500">Binding:</span>{' '}
                          <span className="font-medium">{selectedRow.binding}</span>
                        </div>
                      )}
                      {selectedRow.language && (
                        <div>
                          <span className="text-gray-500">Language:</span>{' '}
                          <span className="font-medium">{selectedRow.language}</span>
                        </div>
                      )}
                      {selectedRow.quantity != null && (
                        <div>
                          <span className="text-gray-500">Quantity:</span>{' '}
                          <span className="font-medium">{selectedRow.quantity}</span>
                        </div>
                      )}
                    </div>
                    {selectedRow.description && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-6">
                          {selectedRow.description}
                        </p>
                      </div>
                    )}
                    {selectedRow.category && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRow.category.split(/[|;,]/).map((cat: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                            >
                              {cat.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-12 text-gray-400">
                    <div className="text-center">
                      <FontAwesomeIcon icon={['fal', 'hand-pointer']} className="text-3xl mb-3" />
                      <p>Select a row to see how it will look</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ CONFIRM STEP ═══ */}
          {step === 'confirm' && stats && (
            <div className="max-w-2xl mx-auto py-4">
              <h3 className="font-semibold text-gray-900 text-lg mb-6">Import Options</h3>

              <div className="space-y-6">
                {/* Import Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'create', label: 'Create Only', desc: 'Only create new records' },
                      { value: 'update', label: 'Update Only', desc: 'Only update existing' },
                      { value: 'upsert', label: 'Upsert', desc: 'Create or update' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setImportMode(opt.value as any)}
                        className={`p-3 border rounded text-left transition ${
                          importMode === opt.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Match Strategy */}
                {importMode !== 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matching Strategy
                    </label>
                    <select
                      value={matchStrategy}
                      onChange={(e) => setMatchStrategy(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    >
                      <option value="none">No matching (always create new)</option>
                      <option value="isbn">Match by ISBN</option>
                      <option value="sku">Match by Book ID (book_id / SKU field)</option>
                      <option value="title_author">Match by Title + Author (fallback)</option>
                      <option value="wp_post_id">Match by WordPress Post ID</option>
                    </select>
                    {matchStrategy === 'title_author' && (
                      <p className="text-xs text-yellow-600 mt-1">
                        <FontAwesomeIcon icon={['fal', 'exclamation-triangle']} className="mr-1" />
                        Title+Author matching may produce false positives. Use stable IDs when
                        possible.
                      </p>
                    )}
                  </div>
                )}

                {/* Default Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Status (for rows without a status)
                  </label>
                  <select
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  >
                    <option value="draft">Draft (not visible)</option>
                    <option value="published">Published (visible immediately)</option>
                    <option value="pending">Pending Review</option>
                  </select>
                </div>

                {/* Admin vendor selector */}
                {role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Vendor
                    </label>
                    <select
                      value={adminVendorId}
                      onChange={(e) => setAdminVendorId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Select a vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={String(v.id)}>
                          {v.shopName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 border rounded p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Import Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Valid rows to process:{' '}
                      <strong className="text-green-700">{stats.validRows}</strong>
                    </div>
                    <div>
                      Invalid rows (skipped):{' '}
                      <strong className="text-red-600">{stats.invalidRows}</strong>
                    </div>
                    <div>
                      Mode: <strong>{importMode}</strong>
                    </div>
                    <div>
                      Matching: <strong>{matchStrategy}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ RESULTS STEP ═══ */}
          {step === 'results' && commitResult && (
            <div className="max-w-2xl mx-auto py-4">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <FontAwesomeIcon
                    icon={['fal', 'check-circle']}
                    className="text-3xl text-green-600"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Import Complete</h3>
                <p className="text-gray-500 mt-1">Processed {commitResult.totalProcessed} rows</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">
                    {commitResult.createdCount}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Created</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">
                    {commitResult.updatedCount}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Updated</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-700">
                    {commitResult.skippedCount}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">Skipped</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
                  <div className="text-3xl font-bold text-red-700">{commitResult.failedCount}</div>
                  <div className="text-xs text-red-600 mt-1">Failed</div>
                </div>
              </div>

              {commitResult.failures.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Failed Rows ({commitResult.failures.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Row
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Title
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {commitResult.failures.map((f, i) => (
                          <tr key={i} className="bg-red-50/30">
                            <td className="px-3 py-2">{f.rowIndex}</td>
                            <td className="px-3 py-2 truncate max-w-[200px]">{f.title}</td>
                            <td className="px-3 py-2 text-red-600">{f.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                <strong>Import ID:</strong> {commitResult.importId}
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation buttons */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div>
            {step !== 'upload' && step !== 'results' && (
              <button
                onClick={() => {
                  const prevIdx = currentStepIndex - 1;
                  if (prevIdx >= 0) setStep(STEPS[prevIdx].key);
                }}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                <FontAwesomeIcon icon={['fal', 'arrow-left']} className="mr-2" />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'results' ? (
              <button
                onClick={() => {
                  onComplete?.();
                  onClose();
                }}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-opacity-90 transition text-sm font-medium"
              >
                Done
              </button>
            ) : step === 'confirm' ? (
              <button
                onClick={handleCommit}
                disabled={loading || (stats?.validRows || 0) === 0}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={['fal', 'check']} />
                    Confirm Import ({stats?.validRows || 0} rows)
                  </>
                )}
              </button>
            ) : step === 'mapping' ? (
              <button
                onClick={applyMappings}
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50 transition text-sm font-medium"
              >
                {loading ? 'Applying...' : 'Apply Mappings & Validate'}
              </button>
            ) : step !== 'upload' ? (
              <button
                onClick={async () => {
                  const nextIdx = currentStepIndex + 1;
                  const nextStep = STEPS[nextIdx]?.key;
                  // When entering preview, fetch fresh valid rows
                  if (nextStep === 'preview') {
                    await loadValidRows();
                  }
                  if (nextIdx < STEPS.length) setStep(STEPS[nextIdx].key);
                }}
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-opacity-90 transition text-sm font-medium"
              >
                Next
                <FontAwesomeIcon icon={['fal', 'arrow-right']} className="ml-2" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
