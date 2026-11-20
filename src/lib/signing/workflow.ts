/**
 * Signing workflow helpers (ported from SignuDoc's signing model).
 *
 * The live Supabase database lags behind the migrations in /supabase, so
 * everything here is designed to work on the original schema and get
 * better once 20261119_signing_workflow.sql has been applied:
 *
 * - Signing order lives in signatories.order_num. Signers that share an
 *   order_num are one "step" and sign at the same time. order_num <= 0
 *   marks a copy recipient: they never sign, they get the finished copy.
 * - Field types beyond the original five (signature, text, checkbox, date,
 *   label) are written natively when the field_type check constraint
 *   allows them, and otherwise stored as "text" with the real type kept in
 *   the tooltip column (see encodeFieldMeta / normalizeFieldRow).
 * - What a signer enters (signature, initials, field values, consent,
 *   decline reason) is kept in signatories.signature_data as a small JSON
 *   envelope, because anonymous signers may update their own signatory row
 *   but not the signature_fields table. A bare image data URL (the old
 *   format) is still read as the signature.
 */

export const MAX_SIGNERS = 25;

export type FieldType =
  | "signature"
  | "initials"
  | "date"
  | "name"
  | "text"
  | "number"
  | "checkbox"
  | "dropdown"
  | "radio"
  | "label"
  | "attachment"
  | "drawing";

/** Types the original signature_fields.field_type check constraint accepts. */
const LEGACY_FIELD_TYPES = new Set(["signature", "text", "checkbox", "date", "label"]);

/** Field types a signer fills in (labels are static text placed by the sender). */
export const FILLABLE_FIELD_TYPES = new Set<string>([
  "signature",
  "initials",
  "date",
  "name",
  "text",
  "number",
  "checkbox",
  "dropdown",
  "radio",
  "attachment",
  "drawing",
]);

export const CHOICE_FIELD_TYPES = new Set<string>(["dropdown", "radio"]);

export const FIELD_DEFAULT_SIZE: Record<string, { width: number; height: number }> = {
  signature: { width: 140, height: 36 },
  initials: { width: 90, height: 36 },
  date: { width: 120, height: 36 },
  name: { width: 150, height: 36 },
  text: { width: 140, height: 36 },
  number: { width: 130, height: 36 },
  checkbox: { width: 24, height: 24 },
  dropdown: { width: 150, height: 36 },
  radio: { width: 150, height: 64 },
  label: { width: 120, height: 36 },
  attachment: { width: 165, height: 54 },
  drawing: { width: 185, height: 110 },
};

export function defaultFieldSize(type: string) {
  return FIELD_DEFAULT_SIZE[type] || { width: 140, height: 36 };
}

export const FIELD_TYPE_LABELS: Record<string, string> = {
  signature: "Signature",
  initials: "Initials",
  date: "Date signed",
  name: "Full name",
  text: "Text",
  number: "Number",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  radio: "Radio buttons",
  label: "Label",
  attachment: "Attachment",
  drawing: "Drawing",
};

/* ------------------------------------------------------------------ */
/* Field metadata codec                                                */
/* ------------------------------------------------------------------ */

const META_PREFIX = "ezs:";

interface StoredFieldMeta {
  t?: string; // real field type when field_type had to fall back to "text"
  tip?: string; // the sender's tooltip
  o?: string[]; // dropdown / radio choices
}

export interface FieldMeta {
  type: string;
  tooltip?: string;
  options?: string[];
}

/** Turns a comma or newline separated list into clean, unique choices. */
export function parseChoices(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    })
    .slice(0, 50);
}

/**
 * Builds the field_type / tooltip pair for a database row.
 * legacy=true stores non-original types as "text" with the real type in tooltip.
 */
export function encodeFieldMeta(meta: FieldMeta, legacy = false): { field_type: string; tooltip: string | null } {
  const needsLegacy = legacy && !LEGACY_FIELD_TYPES.has(meta.type);
  const options = meta.options && meta.options.length > 0 ? meta.options : undefined;
  if (!needsLegacy && !options) {
    return { field_type: meta.type, tooltip: meta.tooltip || null };
  }
  const stored: StoredFieldMeta = {};
  if (needsLegacy) stored.t = meta.type;
  if (meta.tooltip) stored.tip = meta.tooltip;
  if (options) stored.o = options;
  return {
    field_type: needsLegacy ? "text" : meta.type,
    tooltip: META_PREFIX + JSON.stringify(stored),
  };
}

export function decodeFieldMeta(fieldType: string, tooltip: string | null | undefined): FieldMeta {
  if (tooltip && tooltip.startsWith(META_PREFIX)) {
    try {
      const stored = JSON.parse(tooltip.slice(META_PREFIX.length)) as StoredFieldMeta;
      return {
        type: stored.t || fieldType,
        tooltip: stored.tip || undefined,
        options: Array.isArray(stored.o) ? stored.o.map(String) : undefined,
      };
    } catch {
      /* fall through to a plain tooltip */
    }
  }
  return { type: fieldType, tooltip: tooltip || undefined };
}

/**
 * Normalizes a signature_fields row: field_type becomes the real type,
 * tooltip the plain tooltip, and options the choice list. Safe to call twice.
 */
export function normalizeFieldRow<T extends { field_type: string; tooltip?: string | null }>(
  row: T,
): T & { options: string[] } {
  if ((row as any).__normalized) return row as T & { options: string[] };
  const meta = decodeFieldMeta(row.field_type, row.tooltip);
  return {
    ...row,
    field_type: meta.type,
    tooltip: meta.tooltip ?? null,
    options: meta.options || [],
    __normalized: true,
  } as T & { options: string[] };
}

/**
 * Inserts signature_fields rows, retrying in the legacy encoding when the
 * database still has the original field_type check constraint.
 */
export async function insertFieldRows(
  client: any,
  rows: Array<Record<string, any> & { __meta: FieldMeta }>,
): Promise<{ error: any; legacy: boolean }> {
  const build = (legacy: boolean) =>
    rows.map(({ __meta, ...rest }) => ({ ...rest, ...encodeFieldMeta(__meta, legacy) }));

  const first = await client.from("signature_fields").insert(build(false));
  if (!first.error) return { error: null, legacy: false };

  const msg = String(first.error.message || "");
  const isConstraint = first.error.code === "23514" || /check constraint|violates check/i.test(msg);
  if (!isConstraint) return { error: first.error, legacy: false };

  const second = await client.from("signature_fields").insert(build(true));
  return { error: second.error, legacy: true };
}

/* ------------------------------------------------------------------ */
/* Signer payload codec                                                */
/* ------------------------------------------------------------------ */

export interface SignerPayload {
  v: 2;
  signature?: string; // image data URL
  initials?: string; // image data URL
  values?: Record<string, string>; // field id -> value
  consentedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  userAgent?: string;
  senderEmail?: string; // who sent the envelope, for decline/complete notices
  senderName?: string;
}

export function decodeSignerData(raw: string | null | undefined): SignerPayload {
  if (!raw) return { v: 2 };
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") return { ...parsed, v: 2 };
    } catch {
      /* not JSON: treat as legacy */
    }
  }
  if (trimmed.startsWith("data:")) return { v: 2, signature: trimmed };
  return { v: 2 };
}

export function encodeSignerData(payload: Omit<SignerPayload, "v"> | SignerPayload): string {
  return JSON.stringify({ ...payload, v: 2 });
}

/** The signature image for a signatory row, whichever format it was saved in. */
export function signatureImage(sig: { signature_data?: string | null } | null | undefined): string | undefined {
  return decodeSignerData(sig?.signature_data).signature;
}

export function signerValues(sig: { signature_data?: string | null } | null | undefined): Record<string, string> {
  return decodeSignerData(sig?.signature_data).values || {};
}

/* ------------------------------------------------------------------ */
/* Signing order                                                       */
/* ------------------------------------------------------------------ */

export interface SignerLike {
  id?: string;
  email: string;
  name: string;
  order_num: number;
  status?: string;
  signature_data?: string | null;
}

export function isCopyRecipient(s: Pick<SignerLike, "order_num">): boolean {
  return Number(s.order_num) <= 0;
}

export function signersOnly<T extends SignerLike>(list: T[]): T[] {
  return list.filter((s) => !isCopyRecipient(s));
}

export function copyRecipients<T extends SignerLike>(list: T[]): T[] {
  return list.filter((s) => isCopyRecipient(s));
}

export function hasDeclined(list: SignerLike[]): boolean {
  return list.some((s) => s.status === "declined");
}

export function allSignersDone(list: SignerLike[]): boolean {
  const signers = signersOnly(list);
  return signers.length > 0 && signers.every((s) => s.status === "signed");
}

/** The order_num of the step that is signing now, or null when nobody is left. */
export function activeStep(list: SignerLike[]): number | null {
  if (hasDeclined(list)) return null;
  const pending = signersOnly(list).filter((s) => s.status !== "signed");
  if (pending.length === 0) return null;
  return Math.min(...pending.map((s) => Number(s.order_num)));
}

export function signersInStep<T extends SignerLike>(list: T[], step: number | null): T[] {
  if (step === null) return [];
  return signersOnly(list).filter((s) => Number(s.order_num) === step);
}

/** Pending signers whose turn it is. */
export function signersWhoseTurn<T extends SignerLike>(list: T[]): T[] {
  const step = activeStep(list);
  return signersInStep(list, step).filter((s) => s.status !== "signed");
}

export function canSignNow(signer: SignerLike | null | undefined, list: SignerLike[]): boolean {
  if (!signer || isCopyRecipient(signer) || signer.status === "signed" || signer.status === "declined") {
    return false;
  }
  return Number(signer.order_num) === activeStep(list);
}

/** Number of distinct signing steps (1 means everyone signs at the same time). */
export function stepCount(list: SignerLike[]): number {
  return new Set(signersOnly(list).map((s) => Number(s.order_num))).size;
}

/**
 * The status to show for a document. A signer who declines cannot change
 * the documents row (RLS), so "declined" is derived from the signers.
 */
export function displayStatus(
  documentStatus: string,
  signers: Array<Pick<SignerLike, "status">> | null | undefined,
): string {
  if (documentStatus === "pending" && signers?.some((s) => s.status === "declined")) return "declined";
  return documentStatus;
}

/** Adds ?signer=<id> to a signing link so each person lands on their own fields. */
export function signingPath(documentId: string, signerId?: string): string {
  return signerId ? `/document/${documentId}/view?signer=${encodeURIComponent(signerId)}` : `/document/${documentId}/view`;
}

/* ------------------------------------------------------------------ */
/* Consent                                                             */
/* ------------------------------------------------------------------ */

export const ELECTRONIC_RECORDS_DISCLOSURE_VERSION = "2026-11-19";

export const ELECTRONIC_RECORDS_DISCLOSURE = [
  "You agree to receive this document and sign it electronically. Your electronic signature has the same effect as a handwritten one.",
  "You can ask the sender for a paper copy, and you can withdraw this consent before you sign by declining to sign.",
  "To view and keep this document you need a device with a current web browser and a PDF reader. You can download a copy before and after you sign.",
];

/* ------------------------------------------------------------------ */
/* Field values                                                        */
/* ------------------------------------------------------------------ */

export function todayString(date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getFullYear()}`;
}

/** The value a field starts with for a signer (name and date fill themselves in). */
export function initialFieldValue(type: string, signerName: string): string | undefined {
  if (type === "name") return signerName;
  if (type === "date") return todayString();
  return undefined;
}

/** True when the signer has supplied what a required field needs. */
export function isFieldComplete(
  type: string,
  value: string | undefined,
  payload: { signature?: string; initials?: string },
): boolean {
  if (type === "signature") return !!payload.signature;
  if (type === "initials") return !!payload.initials;
  if (type === "checkbox") return value === "true";
  return !!value && value.trim().length > 0;
}
