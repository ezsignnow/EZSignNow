/**
 * The email endpoints used to send to whatever addresses the request named,
 * which made them an open relay for branded mail. They now only send to the
 * people on the document's envelope: its signatories and copy recipients,
 * plus the sender recorded in their signing data.
 *
 * The lookup runs against Supabase with the public key, the caller's own
 * session token (document owners) and the document id as the signing scope
 * header (signers on a signing link), so Row Level Security decides what the
 * caller may see, exactly as it does in the browser.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function supabaseEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://tjsvkdvuspihphtcldot.supabase.co",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_WgE6pWIOVhWvIc6VQpspvg_I70scyVl",
  };
}

function senderEmailOf(raw) {
  if (typeof raw !== "string" || !raw.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.senderEmail === "string" ? parsed.senderEmail : null;
  } catch {
    return null;
  }
}

const norm = (e) => String(e || "").trim().toLowerCase();

/**
 * Returns the set of lower-cased addresses that may receive mail about the
 * document, or null when the document id is invalid or the caller can't see
 * any of its signatories.
 */
export async function envelopeRecipients(documentId, authorization, env = supabaseEnv(), fetchImpl = fetch) {
  if (typeof documentId !== "string" || !UUID.test(documentId)) return null;
  const bearer = typeof authorization === "string" && /^Bearer\s+\S+$/i.test(authorization) ? authorization : `Bearer ${env.anonKey}`;
  const res = await fetchImpl(
    `${env.url}/rest/v1/signatories?document_id=eq.${documentId}&select=email,signature_data`,
    { headers: { apikey: env.anonKey, Authorization: bearer, "x-signing-document": documentId, Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const set = new Set();
  for (const r of rows) {
    if (r?.email) set.add(norm(r.email));
    const sender = senderEmailOf(r?.signature_data);
    if (sender) set.add(norm(sender));
  }
  return set;
}

/** True when every address is on the document's envelope. */
export function allOnEnvelope(addresses, allowed) {
  return !!allowed && addresses.length > 0 && addresses.every((a) => allowed.has(norm(a)));
}
