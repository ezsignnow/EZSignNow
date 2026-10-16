/**
 * Small crypto toolkit for the PDF Standard Security Handler.
 * MD5 and RC4 are implemented here (WebCrypto doesn't offer them); AES and SHA
 * use the browser's WebCrypto.
 */

/* ───────────── MD5 ───────────── */

const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(data: Uint8Array): Uint8Array {
  const len = data.length;
  const padLen = ((len + 8) >> 6) * 64 + 64;
  const buf = new Uint8Array(padLen);
  buf.set(data);
  buf[len] = 0x80;
  const bits = len * 8;
  const dv = new DataView(buf.buffer);
  dv.setUint32(padLen - 8, bits >>> 0, true);
  dv.setUint32(padLen - 4, Math.floor(bits / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v, true));
  return out;
}

/* ───────────── RC4 ───────────── */

export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = new Uint8Array(data.length);
  for (let k = 0, i = 0, j = 0; k < data.length; k++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
    out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

/* ───────────── WebCrypto wrappers ───────────── */

const subtle = () => {
  if (!globalThis.crypto?.subtle) throw new Error("Secure crypto isn't available in this browser (use https or localhost).");
  return globalThis.crypto.subtle;
};

async function aesKey(key: Uint8Array, usage: KeyUsage[]) {
  return subtle().importKey("raw", key, { name: "AES-CBC" }, false, usage);
}

/** AES-CBC with PKCS#7 padding (what PDF uses for strings and streams). */
export async function aesEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().encrypt({ name: "AES-CBC", iv }, await aesKey(key, ["encrypt"]), data));
}

/** AES-CBC without padding (data length must be a multiple of 16). */
export async function aesEncryptNoPad(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const out = await aesEncrypt(key, iv, data);
  return out.subarray(0, data.length);
}

/** AES-CBC decrypt with PKCS#7 padding removal. */
export async function aesDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().decrypt({ name: "AES-CBC", iv }, await aesKey(key, ["decrypt"]), data));
}

/** AES-CBC decrypt of unpadded data (appends a crafted padding block WebCrypto can strip). */
export async function aesDecryptNoPad(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const last = data.subarray(data.length - 16);
  const pad = new Uint8Array(16).fill(16).map((v, i) => v ^ last[i]);
  const extra = await aesEncryptNoPad(key, new Uint8Array(16), pad);
  const joined = new Uint8Array(data.length + 16);
  joined.set(data);
  joined.set(extra, data.length);
  return aesDecrypt(key, iv, joined);
}

export async function sha(alg: "SHA-256" | "SHA-384" | "SHA-512", data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest(alg, data));
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Password bytes for revision 5/6 (UTF-8, at most 127 bytes). */
export function passwordBytesR6(pw: string): Uint8Array {
  return new TextEncoder().encode(pw.normalize("NFKC")).subarray(0, 127);
}

/** Password bytes for revisions 2–4 (Latin-1, padded to 32 bytes). */
const PAD = new Uint8Array([0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a]);
export function padPassword(pw: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const src = [...pw].map((c) => c.charCodeAt(0) & 0xff).slice(0, 32);
  bytes.set(src);
  bytes.set(PAD.subarray(0, 32 - src.length), src.length);
  return bytes;
}

/** ISO 32000-2 Algorithm 2.B (revision 6 hash); revision 5 uses plain SHA-256. */
export async function hashR6(password: Uint8Array, salt: Uint8Array, udata: Uint8Array, revision: number): Promise<Uint8Array> {
  let k = await sha("SHA-256", concat(password, salt, udata));
  if (revision < 6) return k;
  let e = new Uint8Array(0);
  let i = 0;
  while (i < 64 || e[e.length - 1] > i - 32) {
    const block = concat(password, k, udata);
    const k1 = new Uint8Array(block.length * 64);
    for (let j = 0; j < 64; j++) k1.set(block, j * block.length);
    e = await aesEncryptNoPad(k.subarray(0, 16), k.subarray(16, 32), k1);
    let sum = 0;
    for (let j = 0; j < 16; j++) sum += e[j];
    const alg = (["SHA-256", "SHA-384", "SHA-512"] as const)[sum % 3];
    k = await sha(alg, e);
    i++;
  }
  return k.subarray(0, 32);
}
