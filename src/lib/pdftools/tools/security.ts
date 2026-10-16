import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFObjectStreamParser,
  PDFRawStream,
  PDFRef,
  PDFStream,
  PDFString,
  PDFBool,
  PDFWriter,
} from "pdf-lib";
import { type InputFile, type Options, type OutputFile, type ToolContext, ToolError, baseName, pdfOut, str } from "../core";
import {
  aesDecrypt,
  aesDecryptNoPad,
  aesEncrypt,
  aesEncryptNoPad,
  concat,
  equalBytes,
  hashR6,
  md5,
  padPassword,
  passwordBytesR6,
  randomBytes,
  rc4,
} from "../crypto";

type Transform = (bytes: Uint8Array, ref: PDFRef) => Promise<Uint8Array>;

function stringBytes(o: PDFString | PDFHexString): Uint8Array {
  return o.asBytes();
}

/** Applies `fn` to every string inside a (possibly nested) object, returning the replacement. */
async function mapStrings(obj: PDFObject, ref: PDFRef, fn: Transform, doc: PDFDocument): Promise<PDFObject> {
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    const bytes = await fn(stringBytes(obj), ref);
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    return PDFHexString.of(hex);
  }
  if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) obj.set(i, await mapStrings(obj.get(i), ref, fn, doc));
    return obj;
  }
  if (obj instanceof PDFDict) {
    // Signature values are never encrypted.
    const isSig = obj.get(PDFName.of("Type"))?.toString() === "/Sig";
    for (const [k, v] of obj.entries()) {
      if (isSig && k.toString() === "/Contents") continue;
      obj.set(k, await mapStrings(v, ref, fn, doc));
    }
    return obj;
  }
  return obj;
}

/** Rewrites every string and stream of every object (except `skip`). */
async function transformDocument(doc: PDFDocument, fnString: Transform, fnStream: Transform, skip: Set<string>, ctx?: ToolContext) {
  const objects = doc.context.enumerateIndirectObjects();
  let n = 0;
  for (const [ref, obj] of objects) {
    if (++n % 200 === 0) ctx?.progress(`Processing objects (${n} of ${objects.length})`, n / objects.length);
    if (skip.has(ref.toString())) continue;
    if (obj instanceof PDFStream) {
      const type = obj.dict.get(PDFName.of("Type"))?.toString();
      if (type === "/XRef") continue;
      await mapStrings(obj.dict, ref, fnString, doc);
      const data = await fnStream(obj.getContents(), ref);
      doc.context.assign(ref, PDFRawStream.of(obj.dict, data));
    } else if (obj instanceof PDFDict || obj instanceof PDFArray) {
      await mapStrings(obj, ref, fnString, doc);
    }
  }
}

/* ───────────────────────── Protect (AES-256) ───────────────────────── */

const PERM = { print: 1 << 2, modify: 1 << 3, copy: 1 << 4, annotate: 1 << 5, fill: 1 << 8, accessibility: 1 << 9, assemble: 1 << 10, printHigh: 1 << 11 };

export async function protect(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const userPw = str(o.userPassword);
  const ownerPw = str(o.ownerPassword) || userPw;
  if (!userPw && !str(o.ownerPassword)) throw new ToolError("Enter a password to open the file, or an owner password for permissions.");
  if (o.confirmPassword !== undefined && str(o.confirmPassword) !== userPw) throw new ToolError("The passwords don't match.");
  const outs: OutputFile[] = [];
  for (const f of files) {
    ctx.progress(`Encrypting ${f.name}`);
    const doc = await PDFDocument.load(f.bytes, { updateMetadata: false, throwOnInvalidObject: false }).catch((e) => {
      throw new ToolError(/encrypt/i.test(String(e?.message)) ? "This PDF is already protected. Unlock it first." : `Couldn't read this PDF: ${e?.message}`);
    });
    const fileKey = randomBytes(32);

    // Permissions (P): reserved bits set, then allowed actions.
    let p = 0xfffff0c0 | 0;
    const allow = (k: keyof typeof PERM, on: boolean) => (p = on ? p | PERM[k] : p & ~PERM[k]);
    allow("print", o.allowPrint !== false);
    allow("printHigh", o.allowPrint !== false);
    allow("copy", o.allowCopy !== false);
    allow("accessibility", true);
    allow("modify", o.allowModify !== false);
    allow("assemble", o.allowModify !== false);
    allow("annotate", o.allowAnnotate !== false);
    allow("fill", o.allowAnnotate !== false || o.allowModify !== false);

    const u = passwordBytesR6(userPw);
    const ow = passwordBytesR6(ownerPw);
    const uvs = randomBytes(8), uks = randomBytes(8);
    const U = concat(await hashR6(u, uvs, new Uint8Array(0), 6), uvs, uks);
    const UE = await aesEncryptNoPad(await hashR6(u, uks, new Uint8Array(0), 6), new Uint8Array(16), fileKey);
    const ovs = randomBytes(8), oks = randomBytes(8);
    const O = concat(await hashR6(ow, ovs, U, 6), ovs, oks);
    const OE = await aesEncryptNoPad(await hashR6(ow, oks, U, 6), new Uint8Array(16), fileKey);
    const permsPlain = new Uint8Array(16);
    new DataView(permsPlain.buffer).setInt32(0, p, true);
    permsPlain.set([0xff, 0xff, 0xff, 0xff], 4);
    permsPlain.set([0x54, 0x61, 0x64, 0x62], 8); // "Tadb" (T = metadata encrypted)
    permsPlain.set(randomBytes(4), 12);
    const Perms = await aesEncryptNoPad(fileKey, new Uint8Array(16), permsPlain);

    const enc: Transform = async (data) => {
      const iv = randomBytes(16);
      return concat(iv, await aesEncrypt(fileKey, iv, data));
    };
    await transformDocument(doc, enc, enc, new Set(), ctx);

    const hex = (b: Uint8Array) => PDFHexString.of([...b].map((x) => x.toString(16).padStart(2, "0")).join(""));
    const encDict = doc.context.obj({
      Filter: "Standard",
      V: 5,
      R: 6,
      Length: 256,
      CF: { StdCF: { AuthEvent: "DocOpen", CFM: "AESV3", Length: 32 } },
      StmF: "StdCF",
      StrF: "StdCF",
      P: p,
      EncryptMetadata: true,
    });
    encDict.set(PDFName.of("O"), hex(O));
    encDict.set(PDFName.of("U"), hex(U));
    encDict.set(PDFName.of("OE"), hex(OE));
    encDict.set(PDFName.of("UE"), hex(UE));
    encDict.set(PDFName.of("Perms"), hex(Perms));
    const encRef = doc.context.register(encDict);
    const id = hex(randomBytes(16));
    doc.context.trailerInfo.Encrypt = encRef;
    doc.context.trailerInfo.ID = doc.context.obj([id, id]);
    const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
    outs.push(pdfOut(`${baseName(f.name)}-protected`, bytes));
  }
  return outs;
}

/* ───────────────────────── Unlock ───────────────────────── */

const num = (d: PDFDict, k: string, dflt = 0) => d.lookupMaybe(PDFName.of(k), PDFNumber)?.asNumber() ?? dflt;
const bytesOf = (d: PDFDict, k: string): Uint8Array => {
  const v = d.lookup(PDFName.of(k));
  return v instanceof PDFString || v instanceof PDFHexString ? v.asBytes() : new Uint8Array(0);
};

interface Decryptor {
  string: Transform;
  stream: Transform;
}

async function buildDecryptor(doc: PDFDocument, enc: PDFDict, password: string): Promise<Decryptor | null> {
  const V = num(enc, "V");
  const R = num(enc, "R");
  const O = bytesOf(enc, "O");
  const U = bytesOf(enc, "U");
  const P = num(enc, "P");
  const encryptMetadata = !(enc.lookup(PDFName.of("EncryptMetadata")) instanceof PDFBool && enc.lookup(PDFName.of("EncryptMetadata"))?.toString() === "false");

  // Which method strings and streams use.
  const method = (which: "StmF" | "StrF"): "rc4" | "aes" | "aes256" | "none" => {
    if (V < 4) return "rc4";
    const name = enc.lookup(PDFName.of(which))?.toString() ?? "/Identity";
    if (name === "/Identity") return "none";
    const cf = enc.lookupMaybe(PDFName.of("CF"), PDFDict)?.lookupMaybe(PDFName.of(name.slice(1)), PDFDict);
    const cfm = cf?.lookup(PDFName.of("CFM"))?.toString();
    if (cfm === "/AESV2") return "aes";
    if (cfm === "/AESV3") return "aes256";
    if (cfm === "/None") return "none";
    return "rc4";
  };

  let fileKey: Uint8Array | null = null;
  if (R >= 5) {
    const pw = passwordBytesR6(password);
    const UE = bytesOf(enc, "UE"), OE = bytesOf(enc, "OE");
    if (equalBytes(await hashR6(pw, U.subarray(32, 40), new Uint8Array(0), R), U.subarray(0, 32))) {
      fileKey = await aesDecryptNoPad(await hashR6(pw, U.subarray(40, 48), new Uint8Array(0), R), new Uint8Array(16), UE);
    } else if (equalBytes(await hashR6(pw, O.subarray(32, 40), U.subarray(0, 48), R), O.subarray(0, 32))) {
      fileKey = await aesDecryptNoPad(await hashR6(pw, O.subarray(40, 48), U.subarray(0, 48), R), new Uint8Array(16), OE);
    }
  } else {
    const n = R === 2 ? 5 : Math.min(16, Math.max(5, num(enc, "Length", 40) / 8));
    const idArr = doc.context.trailerInfo.ID;
    const idObj = idArr ? doc.context.lookup(idArr) : undefined;
    const id0 = idObj instanceof PDFArray && (idObj.get(0) instanceof PDFHexString || idObj.get(0) instanceof PDFString) ? (idObj.get(0) as PDFHexString).asBytes() : new Uint8Array(0);
    const pBytes = new Uint8Array(4);
    new DataView(pBytes.buffer).setInt32(0, P, true);
    const keyFromUserPad = (padded: Uint8Array) => {
      let h = md5(concat(padded, O, pBytes, id0, R >= 4 && !encryptMetadata ? new Uint8Array([255, 255, 255, 255]) : new Uint8Array(0)));
      if (R >= 3) for (let i = 0; i < 50; i++) h = md5(h.subarray(0, n));
      return h.subarray(0, n);
    };
    const checkUser = (key: Uint8Array) => {
      if (R === 2) return equalBytes(rc4(key, PAD32()), U);
      let x = rc4(key, md5(concat(PAD32(), id0)));
      for (let i = 1; i <= 19; i++) x = rc4(key.map((b) => b ^ i), x);
      return equalBytes(x.subarray(0, 16), U.subarray(0, 16));
    };
    // Try as the user password, then as the owner password.
    let key = keyFromUserPad(padPassword(password));
    if (checkUser(key)) fileKey = key;
    else {
      let h = md5(padPassword(password));
      if (R >= 3) for (let i = 0; i < 50; i++) h = md5(h);
      const ownerKey = h.subarray(0, n);
      let userPad = O;
      if (R === 2) userPad = rc4(ownerKey, O);
      else for (let i = 19; i >= 0; i--) userPad = rc4(ownerKey.map((b) => b ^ i), userPad);
      key = keyFromUserPad(userPad);
      if (checkUser(key)) fileKey = key;
    }
  }
  if (!fileKey) return null;
  const fk = fileKey;

  const objKey = (ref: PDFRef, aes: boolean) => {
    const extra = new Uint8Array([ref.objectNumber & 255, (ref.objectNumber >> 8) & 255, (ref.objectNumber >> 16) & 255, ref.generationNumber & 255, (ref.generationNumber >> 8) & 255]);
    const h = md5(concat(fk, extra, aes ? new Uint8Array([0x73, 0x41, 0x6c, 0x54]) : new Uint8Array(0)));
    return h.subarray(0, Math.min(16, fk.length + 5));
  };
  const make = (m: ReturnType<typeof method>): Transform => async (data, ref) => {
    if (m === "none") return data;
    if (m === "rc4") return rc4(objKey(ref, false), data);
    if (data.length < 32 || data.length % 16) return data.length < 16 ? new Uint8Array(0) : data;
    const key = m === "aes256" ? fk : objKey(ref, true);
    try {
      return await aesDecrypt(key, data.subarray(0, 16), data.subarray(16));
    } catch {
      return aesDecryptNoPad(key, data.subarray(0, 16), data.subarray(16));
    }
  };
  const streamFn = make(method("StmF"));
  const metaSkip = !encryptMetadata;
  return {
    string: make(method("StrF")),
    stream: async (data, ref) => {
      if (metaSkip) {
        const obj = doc.context.lookup(ref);
        if (obj instanceof PDFStream && obj.dict.get(PDFName.of("Type"))?.toString() === "/Metadata") return data;
      }
      return streamFn(data, ref);
    },
  };
}

function PAD32() {
  return padPassword("");
}

/**
 * pdf-lib tries to unpack object streams while loading, which fails while
 * they're still encrypted, and it then drops them. Renaming the type marker
 * (same length, so byte offsets stay valid) makes it keep them as plain
 * streams; they are unpacked after decryption.
 */
const HIDDEN_OBJSTM = "QbjStm";
function hideObjectStreams(bytes: Uint8Array): Uint8Array {
  const text = new TextDecoder("latin1").decode(bytes);
  const out = bytes.slice();
  const re = /\/Type\s*\/ObjStm\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const at = m.index + m[0].length - "ObjStm".length;
    out[at] = "Q".charCodeAt(0);
  }
  return out;
}

export async function unlock(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    ctx.progress(`Unlocking ${f.name}`);
    const doc = await PDFDocument.load(hideObjectStreams(f.bytes), { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    const encRefOrDict = doc.context.trailerInfo.Encrypt;
    const enc = encRefOrDict ? doc.context.lookup(encRefOrDict) : undefined;
    if (!(enc instanceof PDFDict)) throw new ToolError(`${f.name} isn't password-protected.`);
    if (enc.get(PDFName.of("Filter"))?.toString() !== "/Standard") throw new ToolError("This PDF uses certificate-based protection, which can't be removed with a password.");
    const dec = await buildDecryptor(doc, enc, str(o.password));
    if (!dec) throw new ToolError(str(o.password) ? "That password is incorrect." : "This PDF needs a password to open. Enter it above.");

    const skip = new Set<string>();
    if (encRefOrDict instanceof PDFRef) skip.add(encRefOrDict.toString());
    await transformDocument(doc, dec.string, dec.stream, skip, ctx);

    // Unpack object streams (their contents weren't readable until now).
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Type"))?.toString() === `/${HIDDEN_OBJSTM}`) {
        obj.dict.set(PDFName.of("Type"), PDFName.of("ObjStm"));
        await PDFObjectStreamParser.forStream(obj).parseIntoContext();
        doc.context.delete(ref);
      }
    }
    if (encRefOrDict instanceof PDFRef) doc.context.delete(encRefOrDict);
    doc.context.trailerInfo.Encrypt = undefined;

    // Serialise the raw objects, then reload so pdf-lib rebuilds its structures.
    const raw = await PDFWriter.forContext(doc.context, 50).serializeToBuffer();
    const clean = await PDFDocument.load(raw, { updateMetadata: false, throwOnInvalidObject: false });
    clean.getPageCount();
    outs.push(pdfOut(`${baseName(f.name)}-unlocked`, await clean.save({ useObjectStreams: true })));
  }
  return outs;
}
