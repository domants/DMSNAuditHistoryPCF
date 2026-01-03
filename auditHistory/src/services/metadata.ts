// OData Metadata
interface AttributeMetadataOData {
  LogicalName?: string;
  DisplayName?: {
    UserLocalizedLabel?: { Label?: string };
    LocalizedLabels?: { Label?: string; LanguageCode?: number }[];
  };
}
interface AttributeMetadataODataResponse {
  value?: AttributeMetadataOData[];
}

// GlobalContext typings
interface GlobalContextLike {
  getClientUrl(): string;
}
interface XrmLike {
  Utility?: {
    getGlobalContext?: () => GlobalContextLike;
  };
}

export function getClientUrl(): string {
  const xrm = (globalThis as unknown as { Xrm?: XrmLike }).Xrm;
  const url = xrm?.Utility?.getGlobalContext?.()?.getClientUrl?.();
  if (typeof url === 'string' && url.length > 0) return url;

  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;

  throw new Error('Unable to resolve clientUrl (no Xrm global context).');
}

export async function fetchAttributeLabelsViaOData(entityLogicalName: string, logicalNames: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const names = Array.from(new Set(logicalNames)).filter((n) => typeof n === 'string' && n.length > 0 && n !== '(unknown)');
  if (names.length === 0) return map;

  const filter = names.map((n) => `LogicalName eq '${n.replace(/'/g, "''")}'`).join(' or ');
  const clientUrl = getClientUrl();

  //get attribute metadata via OData (get display name label)
  const url =
    `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes` +
    `?$select=LogicalName,DisplayName&$filter=${filter}`;

  const resp = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
  });

  if (!resp.ok) {
    throw new Error(`Metadata fetch failed: ${resp.status} ${resp.statusText}`);
  }

  const json = (await resp.json()) as AttributeMetadataODataResponse;

  for (const a of json.value ?? []) {
    const logical = a.LogicalName;
    if (!logical) continue;

    const label = a.DisplayName?.UserLocalizedLabel?.Label ?? a.DisplayName?.LocalizedLabels?.[0]?.Label ?? logical;

    map.set(logical, label);
  }

  // default
  for (const n of names) if (!map.has(n)) map.set(n, n);

  return map;
}

/** OData entity definition */
interface EntityDefinitionOData {
  PrimaryNameAttribute?: string;
}
export async function fetchPrimaryNameAttributeViaOData(entityLogicalName: string): Promise<string | null> {
  const clientUrl = getClientUrl();

  //get entity metadata via OData (get primary name attribute)
  const url = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=PrimaryNameAttribute`;

  const resp = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
  });

  if (!resp.ok) {
    return null;
  }

  const json = (await resp.json()) as EntityDefinitionOData;
  const p = json.PrimaryNameAttribute;
  return typeof p === 'string' && p.length > 0 ? p : null;
}
