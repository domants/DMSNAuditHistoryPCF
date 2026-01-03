/* eslint-disable react/prop-types */
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridProps,
  DataGridRow,
  Input,
  Label,
  Link,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  TableCellLayout,
  TableColumnDefinition,
  TableColumnSizingOptions,
  TableRowId,
  createTableColumn,
} from '@fluentui/react-components';
import { ArrowClockwise24Regular } from '@fluentui/react-icons';
import type { AuditRow, EntityRef, IAuditHistory } from '../models/audit';

//mobile breakpoint responsive view
const MOBILE_BREAKPOINT = 768;

const cellTopStyle: React.CSSProperties = { height: '100%', alignSelf: 'flex-start' };
const cellLayoutStyle: React.CSSProperties = { alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' };

// ====== CONTENT FONT SIZE ======
const bodyTextStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '30px',
};

const changeLineStyle: React.CSSProperties = {
  ...bodyTextStyle,
  lineHeight: '30px',
  minHeight: '20px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// ====== FILTER BAR STYLE ======
const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '12px 16px',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: '#fff',
  borderBottom: '1px solid rgba(15,23,42,0.08)',
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'flex-start',
};

const filterSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 280,
  flex: '1 1 320px',
};

const filterLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  color: 'rgba(15,23,42,0.65)',
};

const filterButtonStyle: React.CSSProperties = {
  width: '100%',
  justifyContent: 'space-between',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.6)',
  background: '#fff',
};

const filterHelperTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(15,23,42,0.55)',
};

const dateSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 200,
  flex: '1 1 200px',
};

const dateInputStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.6)',
  padding: '6px 10px',
  width: '100%',
};

const resetSectionBaseStyle: React.CSSProperties = {
  display: 'flex',
  flex: '0 0 auto',
  alignItems: 'flex-end',
};

const refreshSectionBaseStyle: React.CSSProperties = {
  display: 'flex',
  flex: '0 0 auto',
  alignItems: 'flex-end',
};

const refreshButtonStyle: React.CSSProperties = {
  borderRadius: '50%',
  width: 42,
  height: 42,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
};

// ====== GRID HEADER STYLE ======
const headerCellStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
};

const gridWrapperStyle: React.CSSProperties = {
  width: '100%',
  overflowX: 'hidden',
  borderTop: '1px solid rgba(0,0,0,0.06)',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 16px 40px rgba(15,23,42,0.08)',
  padding: '4px 12px 16px',
};

const cardsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '12px',
};

const mobileCardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const mobileChangeStyle: React.CSSProperties = {
  borderRadius: 10,
  background: 'rgba(99,102,241,0.06)',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: 'rgba(15,23,42,0.6)',
  fontWeight: 600,
};

const footerBarStyle: React.CSSProperties = {
  marginTop: 12,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  padding: '12px 16px',
  fontSize: 13,
  borderTop: '1px solid rgba(0,0,0,0.06)',
};

const operationPalette = [
  { key: 'create', bg: 'rgba(16,185,129,0.12)', color: '#047857' },
  { key: 'update', bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8' },
  { key: 'delete', bg: 'rgba(248,113,113,0.12)', color: '#b91c1c' },
];

function getOperationAccent(operation?: string): { bg: string; color: string } {
  if (!operation) return { bg: 'rgba(148,163,184,0.2)', color: '#475569' };
  const normalized = operation.toLowerCase();
  const match = operationPalette.find((item) => normalized.includes(item.key));
  return match ?? { bg: 'rgba(79,70,229,0.12)', color: '#4338ca' };
}

function tryParseDate(value: string): Date | undefined {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatAuditValue(raw?: string): string {
  if (!raw) return '';

  const trimmed = raw.trim();
  const zeroTimePattern = /(?:[T\s])00:00(?::00(?:\.0+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;

  if (zeroTimePattern.test(trimmed)) {
    const dateOnly = trimmed.replace(zeroTimePattern, '').trim();
    return dateOnly || trimmed;
  }

  return trimmed;
}

function openRecord(entity: string, id: string): void {
  const xrm = (
    globalThis as unknown as { Xrm?: { Navigation?: { openForm?: (opts: { entityName: string; entityId: string }) => Promise<unknown> } } }
  ).Xrm;

  if (xrm?.Navigation?.openForm) {
    void xrm.Navigation.openForm({ entityName: entity, entityId: id });
    return;
  }

  const base = window.location.origin;
  const url = `${base}/main.aspx?etn=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}&pagetype=entityrecord`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

type SortState = Parameters<NonNullable<DataGridProps['onSortChange']>>[1];
type ColumnComparator = (a: AuditRow, b: AuditRow) => number;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const compareStrings = (a?: string, b?: string): number => {
  const aVal = (a ?? '').trim();
  const bVal = (b ?? '').trim();

  if (!aVal && !bVal) return 0;
  if (!aVal) return 1;
  if (!bVal) return -1;
  return collator.compare(aVal, bVal);
};

const compareDates = (a?: string, b?: string): number => {
  const aTime = a ? tryParseDate(a)?.getTime() : undefined;
  const bTime = b ? tryParseDate(b)?.getTime() : undefined;

  if (aTime === undefined && bTime === undefined) return 0;
  if (aTime === undefined) return 1;
  if (bTime === undefined) return -1;
  return aTime - bTime;
};

const columnComparators: Record<string, ColumnComparator> = {
  operation: (a, b) => compareStrings(a.operation, b.operation),
  createdOn: (a, b) => compareDates(a.createdOn, b.createdOn),
  user: (a, b) => compareStrings(a.user, b.user),
  fieldName: (a, b) => compareStrings(a.changes?.[0]?.field, b.changes?.[0]?.field),
  oldValue: (a, b) => compareStrings(formatAuditValue(a.changes?.[0]?.oldValue), formatAuditValue(b.changes?.[0]?.oldValue)),
  newValue: (a, b) => compareStrings(formatAuditValue(a.changes?.[0]?.newValue), formatAuditValue(b.changes?.[0]?.newValue)),
};

const columns: TableColumnDefinition<AuditRow>[] = [
  createTableColumn<AuditRow>({
    columnId: 'operation',
    compare: columnComparators.operation,
    renderHeaderCell: () => <span style={headerCellStyle}>Operation</span>,
    renderCell: (row) => (
      <TableCellLayout style={cellLayoutStyle}>
        <div style={{ ...cellTopStyle, ...bodyTextStyle }}>{row.operation}</div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'createdOn',
    compare: columnComparators.createdOn,
    renderHeaderCell: () => <span style={headerCellStyle}>Changed Date</span>,
    renderCell: (row) => (
      <TableCellLayout style={cellLayoutStyle}>
        <div style={{ ...cellTopStyle, ...bodyTextStyle }}>{row.createdOn}</div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'user',
    compare: columnComparators.user,
    renderHeaderCell: () => <span style={headerCellStyle}>Changed By</span>,
    renderCell: (row) => (
      <TableCellLayout style={cellLayoutStyle}>
        <div style={{ ...cellTopStyle, ...bodyTextStyle }}>{row.user}</div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'fieldName',
    compare: columnComparators.fieldName,
    renderHeaderCell: () => <span style={headerCellStyle}>Field</span>,
    renderCell: (row) => (
      <TableCellLayout style={cellLayoutStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {(row.changes ?? []).map((c, i) => (
            <div key={i} style={changeLineStyle} title={c.field}>
              {c.field}
            </div>
          ))}
        </div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'oldValue',
    compare: columnComparators.oldValue,
    renderHeaderCell: () => <span style={headerCellStyle}>Old Value</span>,
    renderCell: (row) => (
      <TableCellLayout style={cellLayoutStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {(row.changes ?? []).map((c, i) => {
            const raw = c.oldValue;
            const v = formatAuditValue(raw);
            const r = c.oldRef;

            return (
              <div key={i} style={changeLineStyle} title={(raw ?? '').trim()}>
                {r ? (
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openRecord(r.entity, r.id);
                    }}
                  >
                    {v}
                  </Link>
                ) : (
                  v
                )}
              </div>
            );
          })}
        </div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'newValue',
    compare: columnComparators.newValue,
    renderHeaderCell: () => <span style={headerCellStyle}>New Value</span>,
    renderCell: (row) => (
      <TableCellLayout style={cellLayoutStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {(row.changes ?? []).map((c, i) => {
            const raw = c.newValue;
            const v = formatAuditValue(raw);
            const r = c.newRef;

            return (
              <div key={i} style={changeLineStyle} title={(raw ?? '').trim()}>
                {r ? (
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openRecord(r.entity, r.id);
                    }}
                  >
                    {v}
                  </Link>
                ) : (
                  v
                )}
              </div>
            );
          })}
        </div>
      </TableCellLayout>
    ),
  }),
];

// ====== COLUMN SIZING ======
const columnLayout: Record<string, { minWidth: number; flex: number }> = {
  operation: { minWidth: 90, flex: 1 },
  createdOn: { minWidth: 140, flex: 1 },
  user: { minWidth: 150, flex: 1.2 },
  fieldName: { minWidth: 180, flex: 1.2 },
  oldValue: { minWidth: 240, flex: 1.8 },
  newValue: { minWidth: 240, flex: 1.8 },
};

const columnSizingOptions: TableColumnSizingOptions = Object.fromEntries(
  Object.entries(columnLayout).map(([columnId, layout]) => {
    const targetWidth = Math.max(layout.minWidth, Math.round(layout.minWidth * layout.flex));
    return [
      columnId,
      {
        minWidth: layout.minWidth,
        defaultWidth: targetWidth,
        idealWidth: targetWidth,
      },
    ];
  }),
);

export const AuditHistory: React.FC<IAuditHistory> = (props) => {
  const {
    rows,
    isLoading,
    error,
    height,
    hasNextPage,
    onLoadMore,
    onRefresh,
    enableSort: enableSortInput = false,
    enableColumnSizing: enableColumnSizingInput = false,
  } = props;

  const enableSort = enableSortInput === true;
  const enableColumnSizing = enableColumnSizingInput === true;

  const canRefresh = typeof onRefresh === 'function';
  const handleRefresh = (): void => {
    if (typeof onRefresh === 'function') onRefresh();
  };

  const [fieldQuery, setFieldQuery] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node);
  }, []);

  useEffect(() => {
    if (!containerNode) return;

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        setIsCompact(width <= MOBILE_BREAKPOINT);
      });
      observer.observe(containerNode);
      setIsCompact(containerNode.clientWidth <= MOBILE_BREAKPOINT);
      return () => observer.disconnect();
    }

    const update = () => setIsCompact(containerNode.clientWidth <= MOBILE_BREAKPOINT);
    update();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, [containerNode]);

  const fieldOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const c of r.changes ?? []) if (c.field) set.add(c.field);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredFieldOptions = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase();
    if (!q) return fieldOptions;
    return fieldOptions.filter((f) => f.toLowerCase().includes(q));
  }, [fieldOptions, fieldQuery]);

  const filteredRows = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : undefined;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : undefined;

    const hasFieldFilter = selectedFields.size > 0;

    return rows
      .map((r) => {
        if (!hasFieldFilter) return r;
        const trimmedChanges = (r.changes ?? []).filter((c) => selectedFields.has(c.field));
        return { ...r, changes: trimmedChanges };
      })
      .filter((r) => {
        if (hasFieldFilter && (r.changes ?? []).length === 0) return false;

        if (from || to) {
          const d = tryParseDate(r.createdOn);
          if (!d) return true;
          if (from && d < from) return false;
          if (to && d > to) return false;
        }

        return true;
      });
  }, [rows, selectedFields, fromDate, toDate]);

  const selectedFieldsDisplay = useMemo(() => {
    if (selectedFields.size === 0) return 'All fields';

    const ordered = fieldOptions.filter((f) => selectedFields.has(f));
    if (ordered.length === 0) return 'Filtered fields';

    const previewLimit = 3;
    if (ordered.length <= previewLimit) return ordered.join(', ');

    const shown = ordered.slice(0, previewLimit).join(', ');
    const remaining = ordered.length - previewLimit;
    return `${shown} +${remaining}`;
  }, [selectedFields, fieldOptions]);

  const filterBarResponsiveStyle = useMemo<React.CSSProperties>(
    () => ({
      ...filterBarStyle,
      position: isCompact ? 'static' : 'sticky',
    }),
    [isCompact],
  );

  const filterRowResponsiveStyle = useMemo<React.CSSProperties>(
    () => ({
      ...filterRowStyle,
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'flex-end',
    }),
    [isCompact],
  );

  const filterSectionResponsiveStyle = useMemo<React.CSSProperties>(
    () => ({
      ...filterSectionStyle,
      minWidth: isCompact ? '100%' : 320,
      flex: isCompact ? '1 1 100%' : '1 1 320px',
    }),
    [isCompact],
  );

  const dateSectionResponsiveStyle = useMemo<React.CSSProperties>(
    () => ({
      ...dateSectionStyle,
      minWidth: isCompact ? '100%' : 200,
      flex: isCompact ? '1 1 100%' : '0 0 200px',
    }),
    [isCompact],
  );

  const resetSectionStyle = useMemo<React.CSSProperties>(
    () => ({
      ...resetSectionBaseStyle,
      width: isCompact ? '100%' : 'auto',
      justifyContent: isCompact ? 'flex-start' : 'flex-end',
    }),
    [isCompact],
  );

  const refreshSectionStyle = useMemo<React.CSSProperties>(
    () => ({
      ...refreshSectionBaseStyle,
      width: isCompact ? '100%' : 'auto',
      justifyContent: isCompact ? 'flex-start' : 'flex-end',
      marginLeft: isCompact ? 0 : 'auto',
    }),
    [isCompact],
  );

  const refreshButtonResponsiveStyle = useMemo<React.CSSProperties>(
    () => ({
      ...refreshButtonStyle,
      width: isCompact ? '100%' : refreshButtonStyle.width,
      borderRadius: isCompact ? 12 : '50%',
    }),
    [isCompact],
  );

  const renderValue = useCallback((value?: string, ref?: EntityRef) => {
    const content = formatAuditValue(value);
    if (!ref) return content;

    return (
      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault();
          openRecord(ref.entity, ref.id);
        }}
      >
        {content}
      </Link>
    );
  }, []);

  //default sort
  const defaultSortState = React.useMemo<SortState>(
    () => ({
      sortColumn: 'createdOn',
      sortDirection: 'descending',
    }),
    [],
  );

  const [sortState, setSortState] = useState<SortState>(defaultSortState);

  const sortedRows = useMemo(() => {
    if (!enableSort || !sortState?.sortColumn) return filteredRows;
    const comparator = columnComparators[String(sortState.sortColumn)];
    if (!comparator) return filteredRows;

    const next = [...filteredRows].sort((a, b) => {
      const result = comparator(a, b);
      return sortState.sortDirection === 'descending' ? -result : result;
    });

    return next;
  }, [filteredRows, sortState, enableSort]);

  const mobileCards = (
    <div style={cardsContainerStyle}>
      {sortedRows.map((row) => {
        const accent = getOperationAccent(row.operation);
        return (
          <div key={row.auditId} style={mobileCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: accent.bg, color: accent.color }}>
                {row.operation || 'Unknown'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(15,23,42,0.6)' }}>{row.createdOn}</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{row.user || 'Unassigned'}</div>

            {/* raw attribute */}
            {/* {row.attributeMask ? (
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(15,23,42,0.55)' }}>{row.attributeMask}</div>
            ) : null} */}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(row.changes ?? []).map((change, index) => (
                <div key={index} style={mobileChangeStyle}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{change.field}</div>
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: '#b91c1c' }}>{renderValue(change.oldValue, change.oldRef)}</span>
                    <span style={{ color: '#047857' }}>{renderValue(change.newValue, change.newRef)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {sortedRows.length === 0 && !isLoading ? <div style={emptyStateStyle}>No audit entries match the current filters.</div> : null}
    </div>
  );

  const desktopGrid = (
    <div style={gridWrapperStyle}>
      {sortedRows.length === 0 && !isLoading ? (
        <div style={emptyStateStyle}>No audit entries match the current filters.</div>
      ) : (
        <DataGrid
          style={{ width: '100%' }}
          items={sortedRows}
          columns={columns}
          sortable={enableSort}
          sortState={enableSort ? sortState : undefined}
          onSortChange={enableSort ? (_, nextSortState) => setSortState(nextSortState) : undefined}
          getRowId={(r: AuditRow): TableRowId => r.auditId}
          focusMode="row_unstable"
          resizableColumns={enableColumnSizing}
          columnSizingOptions={enableColumnSizing ? columnSizingOptions : undefined}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }: { renderHeaderCell: () => React.ReactNode }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>

          <DataGridBody>
            {({ item, rowId }: { item: AuditRow; rowId: TableRowId }) => (
              <DataGridRow key={rowId}>
                {({ renderCell }: { renderCell: (row: AuditRow) => React.ReactNode }) => (
                  <DataGridCell style={{ alignItems: 'flex-start' }}>
                    <div style={{ width: '100%', ...bodyTextStyle, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      {renderCell(item)}
                    </div>
                  </DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: height ?? 420 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#fff',
          borderRadius: isCompact ? 16 : 20,
          boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.04)',
        }}
      >
        {error ? (
          <div style={{ padding: 8, ...bodyTextStyle }}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}

        {/* FILTER BAR */}
        <div style={filterBarResponsiveStyle}>
          <div style={filterRowResponsiveStyle}>
            <div style={filterSectionResponsiveStyle}>
              <Label style={filterLabelStyle} htmlFor="fieldFilter">
                Fields
              </Label>

              <Popover positioning="below-start">
                <PopoverTrigger disableButtonEnhancement>
                  <Button id="fieldFilter" appearance="outline" style={filterButtonStyle}>
                    <span style={{ ...bodyTextStyle, textAlign: 'left', flex: 1 }}>{selectedFieldsDisplay}</span>
                    <span style={{ ...bodyTextStyle, opacity: 0.75 }}>
                      {selectedFields.size === 0 ? `${fieldOptions.length}` : `${selectedFields.size}/${fieldOptions.length}`}
                    </span>
                  </Button>
                </PopoverTrigger>

                <PopoverSurface
                  style={{
                    width: isCompact ? 'min(360px, 90vw)' : 380,
                    background: '#fff',
                    padding: 12,
                    borderRadius: 12,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, ...bodyTextStyle }}>Select fields</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{selectedFields.size === 0 ? 'No filter' : `${selectedFields.size} selected`}</div>
                  </div>

                  <Input value={fieldQuery} placeholder="Search fields…" onChange={(_, data) => setFieldQuery(data.value)} />

                  <div style={{ marginTop: 10, maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
                    {filteredFieldOptions.length === 0 ? (
                      <div style={{ padding: 8, opacity: 0.7, ...bodyTextStyle }}>No matches</div>
                    ) : (
                      filteredFieldOptions.map((f) => {
                        const checked = selectedFields.has(f);

                        return (
                          <div
                            key={f}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 8px',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const next = new Set(selectedFields);
                              if (checked) next.delete(f);
                              else next.add(f);
                              setSelectedFields(next);
                            }}
                            role="checkbox"
                            aria-checked={checked}
                            tabIndex={0}
                          >
                            <Checkbox checked={checked} />
                            <div
                              title={f}
                              style={{ ...bodyTextStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}
                            >
                              {f}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
                    <Button
                      appearance="secondary"
                      onClick={() => {
                        setSelectedFields(new Set());
                        setFieldQuery('');
                      }}
                    >
                      Clear
                    </Button>

                    <Button appearance="secondary" onClick={() => setSelectedFields(new Set(fieldOptions))}>
                      Select all
                    </Button>
                  </div>
                </PopoverSurface>
              </Popover>

              <div style={filterHelperTextStyle}>
                {selectedFields.size === 0 ? 'Showing all fields.' : `${selectedFields.size} field${selectedFields.size === 1 ? '' : 's'} focused.`}
              </div>
            </div>
          </div>

          <div style={filterRowResponsiveStyle}>
            <div style={dateSectionResponsiveStyle}>
              <Label style={filterLabelStyle}>From</Label>
              <Input type="date" value={fromDate} onChange={(_, data) => setFromDate(String(data.value ?? ''))} style={dateInputStyle} />
            </div>

            <div style={dateSectionResponsiveStyle}>
              <Label style={filterLabelStyle}>To</Label>
              <Input type="date" value={toDate} onChange={(_, data) => setToDate(String(data.value ?? ''))} style={dateInputStyle} />
            </div>

            <div style={resetSectionStyle}>
              <Button
                appearance="secondary"
                style={{ minWidth: isCompact ? '100%' : 140 }}
                onClick={() => {
                  setSelectedFields(new Set());
                  setFieldQuery('');
                  setFromDate('');
                  setToDate('');
                }}
              >
                Reset filters
              </Button>
            </div>

            {canRefresh ? (
              <div style={refreshSectionStyle}>
                <Button
                  appearance="subtle"
                  style={refreshButtonResponsiveStyle}
                  onClick={handleRefresh}
                  disabled={isLoading}
                  icon={<ArrowClockwise24Regular />}
                  aria-label="Refresh data"
                />
              </div>
            ) : null}
          </div>
        </div>
        {/* END OF FILTER BAR */}

        {/* GRID and CARD VIEW */}
        {isCompact ? mobileCards : desktopGrid}

        <div style={footerBarStyle}>
          {isLoading ? (
            <Spinner size="extra-small" />
          ) : (
            <span style={{ opacity: 0.7 }}>
              Showing {sortedRows.length} of {rows.length}
            </span>
          )}

          {hasNextPage && onLoadMore ? (
            <Button appearance="primary" size="small" onClick={onLoadMore} disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </div>
        {/* END OF GRID and CARD VIEW */}
      </div>
    </div>
  );
};
