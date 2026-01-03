import { IInputs, IOutputs } from './generated/ManifestTypes';
import { AuditHistory } from './src/components/AuditHistory';
import { AuditChangeLine, AuditRow, EntityRef, IAuditHistory, ParsedChange } from './src/models/audit';

import { fetchAttributeLabelsViaOData, fetchPrimaryNameAttributeViaOData } from './src/services/metadata';
import * as React from 'react';

interface ContextInfoLike {
  entityId?: string;
  entityTypeName?: string; // entity logical name
}

interface ModeWithContextInfo extends ComponentFramework.Mode {
  contextInfo?: ContextInfoLike;
}

interface AuditEntity {
  auditid?: string;
  operation?: number;
  createdon?: string;
  _userid_value?: string;
  changedata?: string;
  attributemask?: string;

  'operation@OData.Community.Display.V1.FormattedValue'?: string;
  'createdon@OData.Community.Display.V1.FormattedValue'?: string;
  '_userid_value@OData.Community.Display.V1.FormattedValue'?: string;
}

interface RetrieveMultipleResultLike {
  entities: AuditEntity[];
  nextLink?: string;
}

export class DmsnAuditTimelineControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  private ctx!: ComponentFramework.Context<IInputs>;

  private rows: AuditRow[] = [];
  private isLoading = false;
  private error: string | undefined;
  private nextLink: string | undefined;
  private lastEntityId: string | undefined;

  private lastEntityTypeName: string | undefined;
  private attributeLabelCache = new Map<string, string>();

  private primaryNameAttrCache = new Map<string, string>();
  private recordNameCache = new Map<string, string>();

  private static tryParseEntityRef(value: string): { entity: string; id: string } | null {
    if (!value) return null;

    //"LogicalName,Rec_GUID"
    // split value
    const parts = value.split(',');
    if (parts.length !== 2) return null;

    const entity = parts[0].trim();
    const id = DmsnAuditTimelineControl.sanitizeGuid(parts[1]);

    const guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!entity || !guidRe.test(id)) return null;

    return { entity, id };
  }

  private async getPrimaryNameAttribute(entityLogicalName: string): Promise<string | null> {
    const cached = this.primaryNameAttrCache.get(entityLogicalName);
    if (cached) return cached;

    const primary = await fetchPrimaryNameAttributeViaOData(entityLogicalName);
    if (primary) this.primaryNameAttrCache.set(entityLogicalName, primary);

    return primary;
  }

  private async resolveLookupDisplay(value: string): Promise<string> {
    const parsed = DmsnAuditTimelineControl.tryParseEntityRef(value);
    if (!parsed) return value;

    const key = `${parsed.entity}|${parsed.id}`;
    const cachedName = this.recordNameCache.get(key);
    if (cachedName) return cachedName;

    const primaryAttr = await this.getPrimaryNameAttribute(parsed.entity);
    if (!primaryAttr) return value;

    try {
      const result = (await this.ctx.webAPI.retrieveRecord(parsed.entity, parsed.id, `?$select=${primaryAttr}`)) as unknown as Record<
        string,
        unknown
      >;

      const name = DmsnAuditTimelineControl.toText(result[primaryAttr]);
      const finalName = name || value;

      this.recordNameCache.set(key, finalName);
      return finalName;
    } catch {
      return value;
    }
  }

  //Resolves lookup old and new values to get record actual names
  private async resolveParsedEntityLookupValues(parsedEntities: { changes: ParsedChange[] }[]): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    for (const pe of parsedEntities) {
      for (const c of pe.changes) {
        // oldValue
        if (typeof c.oldValue === 'string') {
          const parsedOld = DmsnAuditTimelineControl.tryParseEntityRef(c.oldValue);
          if (parsedOld) {
            c.oldRef = parsedOld;
            tasks.push(
              this.resolveLookupDisplay(c.oldValue).then((resolved) => {
                c.oldValue = resolved; //display name label
                return undefined;
              }),
            );
          }
        }

        // newValue
        if (typeof c.newValue === 'string') {
          const parsedNew = DmsnAuditTimelineControl.tryParseEntityRef(c.newValue);
          if (parsedNew) {
            c.newRef = parsedNew; //navigation target
            tasks.push(
              this.resolveLookupDisplay(c.newValue).then((resolved) => {
                c.newValue = resolved;
                return undefined;
              }),
            );
          }
        }
      }
    }

    await Promise.all(tasks);
  }

  public init(context: ComponentFramework.Context<IInputs>, _notifyOutputChanged: () => void, _state: ComponentFramework.Dictionary): void {
    this.ctx = context;
  }

  private requestRender(): void {
    this.ctx.factory.requestRender();
  }

  private getNumberParam(name: keyof IInputs, fallback: number): number {
    const p = this.ctx.parameters[name] as unknown as ComponentFramework.PropertyTypes.WholeNumberProperty;
    const raw = p.raw;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
  }

  private getBoolParam(name: keyof IInputs, fallback: boolean): boolean {
    const p = this.ctx.parameters[name] as unknown as ComponentFramework.PropertyTypes.TwoOptionsProperty;
    const raw = p.raw;
    return typeof raw === 'boolean' ? raw : fallback;
  }

  private static toText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return '[Unserializable]';
    }
  }

  private static sanitizeGuid(id: string): string {
    return id.replace(/[{}]/g, '').trim();
  }

  private static isRetrieveMultipleResultLike(v: unknown): v is RetrieveMultipleResultLike {
    if (typeof v !== 'object' || v === null) return false;
    const rec = v as Record<string, unknown>;
    return Array.isArray(rec.entities);
  }

  private static parseChangeData(changeDataRaw: unknown): ParsedChange[] {
    const raw = DmsnAuditTimelineControl.toText(changeDataRaw);
    if (!raw) return [];

    try {
      const obj = JSON.parse(raw) as {
        changedAttributes?: { logicalName?: string; oldValue?: unknown; newValue?: unknown }[];
      };

      const attrs = obj.changedAttributes ?? [];
      return attrs.map((a) => ({
        fieldName: a.logicalName ?? '(unknown)',
        oldValue: DmsnAuditTimelineControl.toText(a.oldValue),
        newValue: DmsnAuditTimelineControl.toText(a.newValue),
      }));
    } catch {
      return [];
    }
  }

  private getEntityId(): string | undefined {
    const fromValue = this.ctx.parameters.value.raw;
    if (typeof fromValue === 'string' && fromValue.trim().length > 0) {
      return DmsnAuditTimelineControl.sanitizeGuid(fromValue);
    }

    const mode = this.ctx.mode as ModeWithContextInfo;
    const fromContextInfo = mode.contextInfo?.entityId;
    if (typeof fromContextInfo === 'string' && fromContextInfo.trim().length > 0) {
      return DmsnAuditTimelineControl.sanitizeGuid(fromContextInfo);
    }

    return undefined;
  }

  private getEntityTypeName(): string | undefined {
    const mode = this.ctx.mode as ModeWithContextInfo;
    const t = mode.contextInfo?.entityTypeName;
    return typeof t === 'string' && t.trim().length > 0 ? t.trim() : undefined;
  }

  private async ensureAttributeLabels(entityTypeName: string, logicalNames: string[]): Promise<void> {
    if (this.lastEntityTypeName !== entityTypeName) {
      this.lastEntityTypeName = entityTypeName;
      this.attributeLabelCache.clear();
    }

    const missing = logicalNames.filter((n) => n && n !== '(unknown)').filter((n) => !this.attributeLabelCache.has(n));

    if (missing.length === 0) return;

    try {
      const fetched = await fetchAttributeLabelsViaOData(entityTypeName, missing);
      for (const [k, v] of fetched.entries()) this.attributeLabelCache.set(k, v);
    } catch {
      for (const n of missing) if (!this.attributeLabelCache.has(n)) this.attributeLabelCache.set(n, n);
    }
  }

  private getFriendlyName(logicalName: string): string {
    return this.attributeLabelCache.get(logicalName) ?? logicalName;
  }

  private refreshEntity(entityId: string): void {
    this.lastEntityId = entityId;
    this.rows = [];
    this.nextLink = undefined;
    this.error = undefined;
    void this.loadFirstPage(entityId);
  }

  // GROUPING HELPERS
  private static buildGroupKey(operation: string, createdOn: string, user: string): string {
    return `${operation}||${createdOn}||${user}`;
  }

  private buildGroupedRows(
    parsedEntities: {
      base: { auditId: string; operation: string; createdOn: string; user: string; attributeMask: string };
      changes: ParsedChange[];
    }[],
    entityTypeName?: string,
  ): AuditRow[] {
    const groups = new Map<
      string,
      {
        auditId: string;
        operation: string;
        createdOn: string;
        user: string;
        changes: AuditChangeLine[];
        masks: string[];
      }
    >();

    for (const item of parsedEntities) {
      const { operation, createdOn, user, attributeMask } = item.base;

      const key = DmsnAuditTimelineControl.buildGroupKey(operation, createdOn, user);
      const groupRowId = `grp:${key}`;

      if (!groups.has(key)) {
        groups.set(key, {
          auditId: groupRowId,
          operation,
          createdOn,
          user,
          changes: [],
          masks: [],
        });
      }

      const g = groups.get(key)!;

      if (attributeMask) g.masks.push(attributeMask);

      for (const c of item.changes) {
        const friendly = entityTypeName ? this.getFriendlyName(c.fieldName) : c.fieldName;

        g.changes.push({
          field: friendly,
          oldValue: c.oldValue ?? '',
          newValue: c.newValue ?? '',
          oldRef: c.oldRef,
          newRef: c.newRef,
        });
      }
    }

    return Array.from(groups.values()).map((g) => ({
      auditId: g.auditId,
      operation: g.operation,
      createdOn: g.createdOn,
      user: g.user,
      changes: g.changes,
      attributeMask: Array.from(new Set(g.masks)).join(' | '),
    }));
  }

  private mergeGroupedRows(existing: AuditRow[], incoming: AuditRow[]): AuditRow[] {
    const map = new Map<string, AuditRow>();
    const ordered: AuditRow[] = [];

    const upsert = (r: AuditRow) => {
      const ex = map.get(r.auditId);
      if (!ex) {
        map.set(r.auditId, { ...r, changes: r.changes ? [...r.changes] : [] });
        ordered.push(map.get(r.auditId)!);
        return;
      }

      const exChanges = ex.changes ?? [];
      const rChanges = r.changes ?? [];
      ex.changes = [...exChanges, ...rChanges];

      ex.attributeMask = [ex.attributeMask, r.attributeMask].filter(Boolean).join(' | ');
    };

    for (const r of existing) upsert(r);
    for (const r of incoming) upsert(r);

    return ordered;
  }

  private async loadFirstPage(entityId: string): Promise<void> {
    const pageSize = this.getNumberParam('pageSize', 25);
    const includeChangeData = this.getBoolParam('includeChangeData', true);

    this.isLoading = true;
    this.error = undefined;
    this.rows = [];
    this.nextLink = undefined;
    this.requestRender();

    try {
      const select = includeChangeData
        ? 'auditid,changedata,_userid_value,createdon,attributemask,operation'
        : 'auditid,_userid_value,createdon,attributemask,operation';

      const query = `?$select=${select}` + `&$filter=_objectid_value eq ${entityId}` + `&$orderby=createdon desc` + `&$top=${pageSize}`;

      const rawResult = (await this.ctx.webAPI.retrieveMultipleRecords('audit', query)) as unknown;
      const result: RetrieveMultipleResultLike = DmsnAuditTimelineControl.isRetrieveMultipleResultLike(rawResult) ? rawResult : { entities: [] };

      const entityTypeName = this.getEntityTypeName();

      const parsedEntities = result.entities.map((e) => {
        const base = {
          auditId: DmsnAuditTimelineControl.toText(e.auditid),
          operation: DmsnAuditTimelineControl.toText(e['operation@OData.Community.Display.V1.FormattedValue'] ?? e.operation),
          createdOn: DmsnAuditTimelineControl.toText(e['createdon@OData.Community.Display.V1.FormattedValue'] ?? e.createdon),
          user: DmsnAuditTimelineControl.toText(e['_userid_value@OData.Community.Display.V1.FormattedValue'] ?? e._userid_value),
          attributeMask: DmsnAuditTimelineControl.toText(e.attributemask),
        };

        const changes = includeChangeData ? DmsnAuditTimelineControl.parseChangeData(e.changedata) : [];
        return { base, changes };
      });

      if (entityTypeName) {
        const names = Array.from(new Set(parsedEntities.flatMap((x) => x.changes.map((c) => c.fieldName)).filter((n) => !!n && n !== '(unknown)')));
        await this.ensureAttributeLabels(entityTypeName, names);
      }

      await this.resolveParsedEntityLookupValues(parsedEntities);

      // merge grouped rows into existing
      const groupedMore = this.buildGroupedRows(parsedEntities, entityTypeName);
      this.rows = this.mergeGroupedRows(this.rows, groupedMore);

      this.nextLink = typeof result.nextLink === 'string' ? result.nextLink : undefined;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : DmsnAuditTimelineControl.toText(err);
    } finally {
      this.isLoading = false;
      this.requestRender();
    }
  }

  private async loadMore(): Promise<void> {
    if (!this.nextLink || this.isLoading) return;

    this.isLoading = true;
    this.error = undefined;
    this.requestRender();

    try {
      const includeChangeData = this.getBoolParam('includeChangeData', true);

      const nextQuery = (() => {
        try {
          const u = new URL(this.nextLink);
          return u.search;
        } catch {
          const idx = this.nextLink.indexOf('?');
          return idx >= 0 ? this.nextLink.substring(idx) : this.nextLink;
        }
      })();

      const rawResult = (await this.ctx.webAPI.retrieveMultipleRecords('audit', nextQuery)) as unknown;
      const result: RetrieveMultipleResultLike = DmsnAuditTimelineControl.isRetrieveMultipleResultLike(rawResult) ? rawResult : { entities: [] };

      const entityTypeName = this.getEntityTypeName();

      const parsedEntities = result.entities.map((e) => {
        const base = {
          auditId: DmsnAuditTimelineControl.toText(e.auditid),
          operation: DmsnAuditTimelineControl.toText(e['operation@OData.Community.Display.V1.FormattedValue'] ?? e.operation),
          createdOn: DmsnAuditTimelineControl.toText(e['createdon@OData.Community.Display.V1.FormattedValue'] ?? e.createdon),
          user: DmsnAuditTimelineControl.toText(e['_userid_value@OData.Community.Display.V1.FormattedValue'] ?? e._userid_value),
          attributeMask: DmsnAuditTimelineControl.toText(e.attributemask),
        };

        const changes = includeChangeData ? DmsnAuditTimelineControl.parseChangeData(e.changedata) : [];
        return { base, changes };
      });

      if (entityTypeName) {
        const names = Array.from(new Set(parsedEntities.flatMap((x) => x.changes.map((c) => c.fieldName)).filter((n) => !!n && n !== '(unknown)')));
        await this.ensureAttributeLabels(entityTypeName, names);
      }

      // merge grouped rows into existing
      const groupedMore = this.buildGroupedRows(parsedEntities, entityTypeName);
      this.rows = this.mergeGroupedRows(this.rows, groupedMore);

      this.nextLink = typeof result.nextLink === 'string' ? result.nextLink : undefined;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : DmsnAuditTimelineControl.toText(err);
    } finally {
      this.isLoading = false;
      this.requestRender();
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    this.ctx = context;

    const height = this.getNumberParam('height', 420);
    const showLoadMore = this.getBoolParam('showLoadMore', false);
    const enableSort = this.getBoolParam('enableSort', false);
    const enableColumnSizing = this.getBoolParam('enableColumnSizing', false);

    const entityId = this.getEntityId();

    if (!entityId) {
      const props: IAuditHistory = {
        rows: [],
        isLoading: false,
        error: 'No record ID detected. Bind the control "Value" to a text field containing the entity ID to retrieve the record ID',
        height,
        hasNextPage: false,
      };
      return React.createElement(AuditHistory, props);
    }

    if (entityId !== this.lastEntityId) this.refreshEntity(entityId);

    const props: IAuditHistory = {
      rows: this.rows,
      isLoading: this.isLoading,
      error: this.error,
      height,
      hasNextPage: showLoadMore && Boolean(this.nextLink),
      onLoadMore: showLoadMore ? () => void this.loadMore() : undefined,
      onRefresh: () => this.refreshEntity(entityId),
      enableSort,
      enableColumnSizing,
    };

    return React.createElement(AuditHistory, props);
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    // no-op
  }
}
