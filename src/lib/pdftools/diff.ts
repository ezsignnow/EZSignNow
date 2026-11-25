export interface DiffOp {
  type: "equal" | "add" | "remove";
  /** Index in the old sequence (equal / remove). */
  a?: number;
  /** Index in the new sequence (equal / add). */
  b?: number;
  value: string;
}

/** Hard cap on edit distance explored; beyond it the remaining middle is reported as replaced wholesale. */
const MAX_D = 2500;

/**
 * Line diff using Myers' O(ND) algorithm, with common head/tail trimmed first.
 * Returns an edit script in order, where each op is equal, add or remove.
 */
export function diffSequences(a: string[], b: string[]): DiffOp[] {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tailA = a.length;
  let tailB = b.length;
  while (tailA > head && tailB > head && a[tailA - 1] === b[tailB - 1]) {
    tailA--;
    tailB--;
  }
  const ops: DiffOp[] = [];
  for (let i = 0; i < head; i++) ops.push({ type: "equal", a: i, b: i, value: a[i] });
  const midA = a.slice(head, tailA);
  const midB = b.slice(head, tailB);
  for (const op of myers(midA, midB)) {
    ops.push({ ...op, a: op.a === undefined ? undefined : op.a + head, b: op.b === undefined ? undefined : op.b + head });
  }
  for (let k = 0; k < a.length - tailA; k++) ops.push({ type: "equal", a: tailA + k, b: tailB + k, value: a[tailA + k] });
  return ops;
}

function myers(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  if (!n && !m) return [];
  if (!n) return b.map((value, i) => ({ type: "add", b: i, value }));
  if (!m) return a.map((value, i) => ({ type: "remove", a: i, value }));
  const max = Math.min(n + m, MAX_D);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) x = v[offset + k + 1];
      else x = v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break outer;
      }
    }
  }
  // Too different to align cheaply: treat the whole middle as replaced.
  if (found < 0) return [...a.map((value, i): DiffOp => ({ type: "remove", a: i, value })), ...b.map((value, i): DiffOp => ({ type: "add", b: i, value }))];

  const rev: DiffOp[] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const vd = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1]) ? k + 1 : k - 1;
    const prevX = vd[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      x--;
      y--;
      rev.push({ type: "equal", a: x, b: y, value: a[x] });
    }
    if (x === prevX) {
      y--;
      rev.push({ type: "add", b: y, value: b[y] });
    } else {
      x--;
      rev.push({ type: "remove", a: x, value: a[x] });
    }
  }
  while (x > 0 && y > 0) {
    x--;
    y--;
    rev.push({ type: "equal", a: x, b: y, value: a[x] });
  }
  return rev.reverse();
}

/** Collapses whitespace so cosmetic spacing differences aren't reported as changes. */
export function normalizeLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
