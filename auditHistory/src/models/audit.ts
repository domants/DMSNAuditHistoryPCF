export interface EntityRef {
  entity: string;
  id: string;
}

export interface AuditChangeLine {
  field: string;
  oldValue: string;
  newValue: string;
  oldRef?: EntityRef;
  newRef?: EntityRef;
}

export interface AuditRow {
  auditId: string;
  operation: string;
  createdOn: string;
  user: string;
  changes?: AuditChangeLine[];
  attributeMask?: string;
}

export interface IAuditHistory {
  rows: AuditRow[];
  isLoading: boolean;
  error?: string;
  height?: number;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  enableSort?: boolean;
  enableColumnSizing?: boolean;
}

export interface ParsedChange {
  fieldName: string;
  oldValue: string;
  newValue: string;
  oldRef?: EntityRef;
  newRef?: EntityRef;
}
