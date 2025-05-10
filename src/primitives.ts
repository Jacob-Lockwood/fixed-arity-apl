type GlyphKind = `${"mon" | "dy"}adic ${"function" | "modifier"}`;
type Glyph = { glyph: string; kind: GlyphKind; def: (...v: Val[]) => Val };

export type Val =
  | { kind: "character"; data: number }
  | { kind: "number"; data: number }
  | { kind: "array"; shape: number[]; data: Val[] }
  | { kind: "function"; arity: number; data: (...x: Val[]) => Val };

export const F = (
  arity: number,
  data: (...v: Val[]) => Val
): Val & { kind: "function" } => ({
  kind: "function",
  arity,
  data,
});
export const N = (data: number): Val => ({ kind: "number", data });
export const A = (shape: number[], data: Val[]): Val => ({
  kind: "array",
  shape,
  data,
});

export function display(val: Val): string {
  if (val.kind === "number") return "" + val.data;
  if (val.kind === "character") return `'${String.fromCodePoint(val.data)}'`;
  if (val.kind === "function") return `<${val.arity === 1 ? "monad" : "dyad"}>`;
  if (val.shape[0] === 0) return `[]`;
  if (val.shape.length === 1 && val.data.every((v) => v.kind === "character")) {
    return `"${String.fromCodePoint(...val.data.map((v) => v.data))}"`;
  }
  if (val.shape.length === 0) return display(val.data[0]);
  const c = cells(val, -1).data as Val[];
  return `[${c.map(display).join(" ")}]`;
  // return JSON.stringify(val, null, 2);
}

function match(a: readonly unknown[], b: readonly unknown[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
function each(fn: (...x: Val[]) => Val, ...x: Val[]): Val {
  const [a, b] = x;
  if (a.kind === "array") {
    if (b?.kind === "array") {
      if (!match(a.shape, b.shape))
        throw new Error("Cannot iterate over arrays of different shape");
      const d = a.data.map((v, i) => fn(v, b.data[i]));
      return A(a.shape, d);
    }
    const d = a.data.map((v) => fn(v, b));
    return A(a.shape, d);
  }
  if (b?.kind === "array") {
    const d = b.data.map((v) => fn(a, v));
    return A(b.shape, d);
  }
  return fn(a, b);
}
export function cells(a: Val, r: number): Val {
  if (a.kind !== "array" || r === 0) return a;
  const frame = a.shape.slice(0, -r);
  const cell = a.shape.slice(-r);
  const delta = cell.reduce((a, b) => a * b, 1);
  const data: Val[] = [];
  for (let i = 0; i < a.data.length; i += delta) {
    const chunk = a.data.slice(i, i + delta);
    data.push(A(cell, chunk));
  }
  return A(frame, data);
}
export function atRank(ranks: number[], fn: (...x: Val[]) => Val) {
  return (...xs: Val[]) =>
    each(fn, ...xs.map((x, i) => cells(x, ranks[i] ?? ranks[0])));
}
export const range = (shape: number[]): Val =>
  A(
    shape,
    Array(shape.reduce((a, b) => a * b))
      .fill(0)
      .map((_, i) => N(i))
  );
function iota(y: Val) {
  if (y.kind === "number") return range([y.data]);
  if (y.kind === "array") {
    if (y.shape.length === 1) {
      if (y.data.every((v) => v.kind === "number"))
        return range(y.data.map((v) => v.data));
      throw new Error("Cannot take range of non-numeric vector");
    }
    throw new Error("Cannot take range of non-vector array");
  }
  throw new Error(`Cannot take range of ${y.kind}`);
}
function add(x: Val, y: Val): Val {
  if (x.kind === "array" || y.kind === "array") return each(add, x, y);
  if (x.kind !== "number") {
    if (y.kind === "number") return add(y, x);
    throw new Error(`Cannot add ${x.kind} and ${y.kind}`);
  }
  if (y.kind === "function") throw new Error(`Cannot add number and function`);
  return { kind: y.kind, data: x.data + y.data };
}
function mod(x: Val, y: Val): Val {
  if (x.kind === "array" || y.kind === "array") return each(mod, x, y);
  if (x.kind !== "number" || y.kind !== "number")
    throw new Error(`Cannot mod ${x.kind} and ${y.kind}`);
  return N(x.data >= 0 ? x.data % y.data : y.data + (x.data % y.data));
}
function div(x: Val, y: Val) {
  if (x.kind === "array" || y.kind === "array") return each(div, x, y);
  if (x.kind !== "number" || y.kind !== "number")
    throw new Error(`Cannot divide ${x.kind} and ${y.kind}`);
  return N(x.data / y.data);
}
function eq(x: Val, y: Val) {
  if (x.kind === "array" || y.kind === "array") return each(eq, x, y);
  if (x.kind === "function" || y.kind === "function") return N(0);
  return N(x.kind === y.kind && x.data === y.data ? 1 : 0);
}
function not(y: Val) {
  if (y.kind === "array") return each(not, y);
  if (y.kind !== "number") throw new Error(`Cannot take NOT of ${y.kind}`);
  return N(1 - y.data);
}
function ne(x: Val, y: Val) {
  return not(eq(x, y));
}
function gt(x: Val, y: Val) {
  if (x.kind === "array" || y.kind === "array") return each(gt, y);
  if (x.kind !== y.kind)
    throw new Error(`Cannot compare ${x.kind} and ${y.kind}`);
  if (x.kind === "function" || y.kind === "function")
    throw new Error(`Cannot compare functions`);
  return N(x.data > y.data ? 1 : 0);
}
function ge(x: Val, y: Val) {
  return max(gt(x, y), eq(x, y));
}
function lt(x: Val, y: Val) {
  return not(ge(x, y));
}
function le(x: Val, y: Val) {
  return not(gt(x, y));
}
function max(x: Val, y: Val) {
  if (x.kind === "array" || y.kind === "array") return each(gt, y);
  if (gt(x, y)) return x;
  return y;
}
function mEach(y: Val): Val {
  if (y.kind !== "function")
    throw new Error("Operand to each must be a function");
  return F(y.arity, (...x) => each(y.data, ...x));
}
function reduce(y: Val): Val {
  if (y.kind !== "function" || y.arity !== 2)
    throw new Error("Operand to reduce must be a dyadic function");
  return F(1, (x) => {
    if (x.kind !== "array") throw new Error(`Cannot reduce ${x.kind}`);
    const c = cells(x, -1) as Val & { kind: "array" };
    return c.data.reduce((acc, val) => y.data(acc, val));
  });
}
function backwards(y: Val) {
  if (y.kind !== "function")
    throw new Error("Operand to backwards must be a function");
  if (y.arity === 2) return F(2, (g, h) => y.data(h, g));
  return y;
}
export function compose(x: Val, y: Val) {
  if (x.kind !== "function") {
    if (y.kind !== "function")
      throw new Error("Cannot compose two non-functions");
    return compose(backwards(y), x);
  }
  if (y.kind === "function") {
    if (x.arity === 1) return F(y.arity, (...v) => x.data(y.data(...v)));
    return F(y.arity, (g, h) => x.data(g, y.data(g, h)));
  }
  if (x.arity === 1) return x.data(y);
  return F(1, (g) => x.data(g, y));
}

export const glyphs: Record<string, Glyph> = {
  iota: { glyph: "⍳", kind: "monadic function", def: iota },
  add: { glyph: "+", kind: "dyadic function", def: add },
  eq: { glyph: "=", kind: "dyadic function", def: eq },
  ne: { glyph: "≠", kind: "dyadic function", def: ne },
  gt: { glyph: ">", kind: "dyadic function", def: gt },
  ge: { glyph: "≥", kind: "dyadic function", def: ge },
  lt: { glyph: "<", kind: "dyadic function", def: lt },
  le: { glyph: "≤", kind: "dyadic function", def: le },
  mod: { glyph: "%", kind: "dyadic function", def: mod },
  div: { glyph: "÷", kind: "dyadic function", def: div },
  each: { glyph: "¨", kind: "monadic modifier", def: mEach },
  reduce: { glyph: "/", kind: "monadic modifier", def: reduce },
  jot: { glyph: "∘", kind: "dyadic modifier", def: compose },
};

export function dataBySymbol(inpglyph: string) {
  return Object.entries(glyphs).find(([, { glyph }]) => glyph === inpglyph)!;
}
