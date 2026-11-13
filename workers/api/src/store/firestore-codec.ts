/**
 * Plain JSON <-> Firestore REST "Value" encoding.
 * Integers (money in kobo, stock) use integerValue so they never become floats.
 * Dates are stored as ISO 8601 strings (PLAN.md), which sort correctly as strings.
 */

export type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

export type FsFields = Record<string, FsValue>;

export function encodeValue(v: unknown): FsValue {
  if (v === null) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.filter((x) => x !== undefined).map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } };
  throw new TypeError(`Cannot encode ${typeof v} for Firestore`);
}

export function encodeFields(obj: Record<string, unknown>): FsFields {
  const out: FsFields = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = encodeValue(v);
  return out;
}

export function decodeValue(v: FsValue): unknown {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) {
    const n = Number(v.integerValue);
    if (!Number.isSafeInteger(n)) throw new RangeError(`Integer out of range: ${v.integerValue}`);
    return n;
  }
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  // timestampValue, referenceValue etc. are not used by this app; keep them as raw strings if present.
  const raw = Object.values(v as Record<string, unknown>)[0];
  return typeof raw === "string" ? raw : null;
}

export function decodeFields(fields: FsFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}
