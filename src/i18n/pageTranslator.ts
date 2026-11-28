/**
 * Translates every piece of English UI text on the page, not just the strings wired through t().
 *
 * How it works: `strings/en.txt` lists the app's English UI strings (generated from the source by
 * scripts/extract-ui-strings.mjs), and `strings/<lang>.txt` holds the translation on the line with
 * the same number. A MutationObserver watches the DOM and swaps any text node or attribute
 * (placeholder, title, aria-label, alt) whose whole text matches an English string. Only exact,
 * known strings are touched, so names, emails, document titles and other user content stay as typed.
 *
 * React keeps working because only a text node's value is changed, never the node itself. When React
 * later writes a new value we notice it differs from what we wrote and translate the new one.
 *
 * Opt out for a subtree with `data-no-translate` or `translate="no"`.
 */

export type PhraseBook = Map<string, string>;

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
/** Elements whose text is never translated (TEXTAREA holds what the user typed). */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
const SKIP_SELECTOR = '[data-no-translate],[translate="no"],[contenteditable="true"],.textLayer,.annotationLayer';

/** Parses the "index<TAB>text" line format used by the strings files. */
export function parseStrings(raw: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const line of raw.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 1) continue;
    const idx = Number(line.slice(0, tab));
    const text = line.slice(tab + 1).replace(/\r$/, "");
    if (Number.isInteger(idx) && text) out.set(idx, text);
  }
  return out;
}

export function buildPhraseBook(enRaw: string, langRaw: string): PhraseBook {
  const en = parseStrings(enRaw);
  const tr = parseStrings(langRaw);
  const book: PhraseBook = new Map();
  for (const [i, source] of en) {
    const t = tr.get(i);
    if (t && t !== source) book.set(source, t);
  }
  return book;
}

interface Pattern {
  re: RegExp;
  /** Translation with slots marked as \u0000<n>\u0000. */
  out: string;
  /** Slot number for each capture group, in order. */
  order: number[];
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strings with {0}-style slots (from template literals) become patterns, e.g. "{0} of {1} signed". */
function compilePatterns(book: PhraseBook): Pattern[] {
  const out: Pattern[] = [];
  for (const [src, tr] of book) {
    if (!/\{\d\}/.test(src)) continue;
    const order: number[] = [];
    const body = escapeRe(src).replace(/\\\{(\d)\\\}/g, (_, d) => {
      order.push(Number(d));
      return "(.+?)";
    });
    out.push({ re: new RegExp(`^${body}$`), out: tr.replace(/\{(\d)\}/g, (_, d) => `\u0000${d}\u0000`), order });
  }
  // Longer, more specific patterns first so "{0} of {1} signed" beats "{0} signed".
  return out.sort((a, b) => b.re.source.length - a.re.source.length);
}

export class PageTranslator {
  private book: PhraseBook = new Map();
  private patterns: Pattern[] = [];
  private cache = new Map<string, string | null>();
  private textOriginal = new WeakMap<Text, string>();
  private textWritten = new WeakMap<Text, string>();
  private attrState = new WeakMap<Element, Record<string, { original: string; written: string }>>();
  private observer: MutationObserver | null = null;
  private root: Node | null = null;

  setPhraseBook(book: PhraseBook) {
    this.book = book;
    this.patterns = compilePatterns(book);
    this.cache.clear();
    if (this.root) this.walk(this.root);
  }

  start(root: Node = document.body) {
    if (this.observer) return;
    this.root = root;
    this.observer = new MutationObserver((records) => this.onMutations(records));
    this.observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    this.walk(root);
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.root = null;
  }

  /** Translation for one English string, or null if it isn't a known UI string. */
  lookup(text: string): string | null {
    const cached = this.cache.get(text);
    if (cached !== undefined) return cached;
    let result: string | null = null;
    if (this.book.size) {
      const norm = text.replace(/\s+/g, " ").trim();
      result = this.book.get(norm) ?? null;
      if (result == null) {
        // "Email:" / "Name *" / "Loading…" → translate the core, keep the decoration.
        const m = norm.match(/^([\s•·*-]*)(.*?)([\s:*.…!?]*)$/);
        if (m && m[2] && m[2] !== norm) {
          const core = this.book.get(m[2]);
          if (core) result = m[1] + core + m[3];
        }
      }
      if (result == null && /\d|\S\s\S/.test(norm)) {
        for (const p of this.patterns) {
          const m = norm.match(p.re);
          if (!m) continue;
          const slots: Record<number, string> = {};
          p.order.forEach((slot, gi) => (slots[slot] = this.lookup(m[gi + 1]) ?? m[gi + 1]));
          result = p.out.replace(/\u0000(\d)\u0000/g, (_, d) => slots[Number(d)] ?? "");
          break;
        }
      }
    }
    if (this.cache.size > 5000) this.cache.clear();
    this.cache.set(text, result);
    return result;
  }

  private skipped(el: Element | null): boolean {
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName) || el instanceof SVGElement) return true;
    return !!el.closest(SKIP_SELECTOR);
  }

  private translateText(node: Text) {
    const current = node.nodeValue ?? "";
    let original: string;
    if (this.textWritten.get(node) === current && this.textOriginal.has(node)) {
      original = this.textOriginal.get(node)!;
    } else {
      original = current;
      this.textOriginal.set(node, original);
    }
    const trimmed = original.trim();
    if (!trimmed || !/[A-Za-z]/.test(trimmed)) return;
    if (this.skipped(node.parentElement)) return;
    const tr = this.lookup(trimmed);
    const next = tr ? original.replace(trimmed, tr) : original;
    if (next !== current) node.nodeValue = next;
    this.textWritten.set(node, next);
  }

  private translateAttr(el: Element, attr: string) {
    const current = el.getAttribute(attr);
    if (current == null) return;
    const state = this.attrState.get(el) ?? {};
    let original = current;
    if (state[attr] && state[attr].written === current) original = state[attr].original;
    if (!/[A-Za-z]/.test(original)) return;
    if (el instanceof SVGElement || el.closest(SKIP_SELECTOR)) return;
    const next = this.lookup(original.trim()) ?? original;
    state[attr] = { original, written: next };
    this.attrState.set(el, state);
    if (next !== current) el.setAttribute(attr, next);
  }

  private translateElementAttrs(el: Element) {
    for (const a of ATTRS) if (el.hasAttribute(a)) this.translateAttr(el, a);
  }

  walk(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
      this.translateText(root as Text);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      const el = root as Element;
      if (el instanceof SVGElement || el.closest(SKIP_SELECTOR) || (SKIP_TAGS.has(el.tagName) && el.tagName !== "TEXTAREA")) return;
      this.translateElementAttrs(el);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as Element;
          if (el instanceof SVGElement || el.matches(SKIP_SELECTOR) || (SKIP_TAGS.has(el.tagName) && el.tagName !== "TEXTAREA")) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) this.translateText(n as Text);
      else this.translateElementAttrs(n as Element);
      n = walker.nextNode();
    }
  }

  private onMutations(records: MutationRecord[]) {
    for (const r of records) {
      if (r.type === "characterData") this.translateText(r.target as Text);
      else if (r.type === "attributes" && r.attributeName) this.translateAttr(r.target as Element, r.attributeName);
      else r.addedNodes.forEach((n) => this.walk(n));
    }
  }
}
