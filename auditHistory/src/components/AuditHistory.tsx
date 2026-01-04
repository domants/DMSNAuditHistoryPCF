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
    renderHeaderCell: () => (
      <TableCellLayout className="cell-layout">
        <span className="header-cell">Operation</span>
      </TableCellLayout>
    ),
    renderCell: (row) => (
      <TableCellLayout className="cell-layout">
        <div className="cell-top body-text">{row.operation}</div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'createdOn',
    compare: columnComparators.createdOn,
    renderHeaderCell: () => (
      <TableCellLayout className="cell-layout">
        <span className="header-cell">Changed Date</span>
      </TableCellLayout>
    ),
    renderCell: (row) => (
      <TableCellLayout className="cell-layout">
        <div className="cell-top body-text">{row.createdOn}</div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'user',
    compare: columnComparators.user,
    renderHeaderCell: () => (
      <TableCellLayout className="cell-layout">
        <span className="header-cell">Changed By</span>
      </TableCellLayout>
    ),
    renderCell: (row) => (
      <TableCellLayout className="cell-layout">
        <div className="cell-top body-text">{row.user}</div>
      </TableCellLayout>
    ),
  }),
  createTableColumn<AuditRow>({
    columnId: 'fieldName',
    compare: columnComparators.fieldName,
    renderHeaderCell: () => (
      <TableCellLayout className="cell-layout">
        <span className="header-cell">Field</span>
      </TableCellLayout>
    ),
    renderCell: (row) => (
      <TableCellLayout className="cell-layout">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {(row.changes ?? []).map((c, i) => (
            <div key={i} className="change-line" title={c.field}>
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
    renderHeaderCell: () => (
      <TableCellLayout className="cell-layout">
        <span className="header-cell">Old Value</span>
      </TableCellLayout>
    ),
    renderCell: (row) => (
      <TableCellLayout className="cell-layout">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {(row.changes ?? []).map((c, i) => {
            const raw = c.oldValue;
            const v = formatAuditValue(raw);
            const r = c.oldRef;

            return (
              <div key={i} className="change-line" title={(raw ?? '').trim()}>
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
    renderHeaderCell: () => (
      <TableCellLayout className="cell-layout">
        <span className="header-cell">New Value</span>
      </TableCellLayout>
    ),
    renderCell: (row) => (
      <TableCellLayout className="cell-layout">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {(row.changes ?? []).map((c, i) => {
            const raw = c.newValue;
            const v = formatAuditValue(raw);
            const r = c.newRef;

            return (
              <div key={i} className="change-line" title={(raw ?? '').trim()}>
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

  //responsive style - mobile/desktop views
  const filterBarClass = isCompact ? 'filter-bar filter-bar-mobile' : 'filter-bar';
  const filterRowClass = isCompact ? 'filter-row filter-row-mobile' : 'filter-row';
  const filterSectionClass = isCompact ? 'filter-section filter-section-mobile' : 'filter-section';
  const dateSectionClass = isCompact ? 'date-section date-section-mobile' : 'date-section';
  const resetSectionClass = isCompact ? 'reset-section-base reset-section-mobile' : 'reset-section-base';
  const refreshSectionClass = isCompact ? 'refresh-section-base refresh-section-mobile' : 'refresh-section-base';
  const refreshButtonClass = isCompact ? 'refresh-button refresh-button-mobile' : 'refresh-button';

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
    <div className="cards-container">
      {sortedRows.map((row) => {
        const accent = getOperationAccent(row.operation);
        return (
          <div key={row.auditId} className="mobile-card">
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
                <div key={index} className="mobile-change">
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

      {sortedRows.length === 0 && !isLoading ? <div className="empty-state">No audit entries match the current filters.</div> : null}
    </div>
  );

  const desktopGrid = (
    <div className="grid-wrapper">
      {sortedRows.length === 0 && !isLoading ? (
        <div className="empty-state">No audit entries match the current filters.</div>
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

          <DataGridBody className="data-grid-body">
            {({ item, rowId }: { item: AuditRow; rowId: TableRowId }) => (
              <DataGridRow key={rowId} className="data-grid-body">
                {({ renderCell }: { renderCell: (row: AuditRow) => React.ReactNode }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
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
          <div className="body-text" style={{ padding: 8 }}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}

        {/* FILTER BAR */}
        <div className={filterBarClass}>
          <div className={filterRowClass}>
            <div className={filterSectionClass}>
              <Label className="filter-label" htmlFor="fieldFilter">
                Fields
              </Label>

              <Popover positioning="below-start">
                <PopoverTrigger disableButtonEnhancement>
                  <Button id="fieldFilter" appearance="outline" className="filter-button">
                    <span className="body-text" style={{ textAlign: 'left', flex: 1 }}>
                      {selectedFieldsDisplay}
                    </span>
                    <span className="body-text" style={{ opacity: 0.75 }}>
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
                    <div className="body-text" style={{ fontWeight: 700 }}>
                      Select fields
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{selectedFields.size === 0 ? 'No filter' : `${selectedFields.size} selected`}</div>
                  </div>

                  <Input value={fieldQuery} placeholder="Search fields…" onChange={(_, data) => setFieldQuery(data.value)} />

                  <div style={{ marginTop: 10, maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
                    {filteredFieldOptions.length === 0 ? (
                      <div className="body-text" style={{ padding: 8, opacity: 0.7 }}>
                        No matches
                      </div>
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
                              className="body-text"
                              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}
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

              <div className="filter-helper-text">
                {selectedFields.size === 0 ? 'Showing all fields.' : `${selectedFields.size} field${selectedFields.size === 1 ? '' : 's'} focused.`}
              </div>
            </div>
          </div>

          <div className={filterRowClass}>
            <div className="date-with-actions">
              <div className={dateSectionClass}>
                <Label className="filter-label">From</Label>
                <Input type="date" value={fromDate} onChange={(_, data) => setFromDate(String(data.value ?? ''))} className="date-input" />
              </div>

              <div className={dateSectionClass}>
                <Label className="filter-label">To</Label>
                <Input type="date" value={toDate} onChange={(_, data) => setToDate(String(data.value ?? ''))} className="date-input" />
              </div>

              <div className={resetSectionClass}>
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
            </div>

            {canRefresh ? (
              <div className={refreshSectionClass}>
                <Button
                  appearance="subtle"
                  className={refreshButtonClass}
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

        <div className="footer-bar">
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
