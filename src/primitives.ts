export type Val =
    | { kind: "character"; data: number }
    | { kind: "number"; data: number }
    | { kind: "array"; shape: number[]; data: Val[] }
    | { kind: "function"; arity: number; data: (...x: Val[]) => Val };

export const F = (
    arity: number,
    data: (...v: Val[]) => Val,
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
    if (val.kind === "character") {
        const j = JSON.stringify(String.fromCodePoint(val.data));
        return `'${j.slice(1, -1).replace(/'/g, "\\'")}'`;
    }
    if (val.kind === "function") return `<${val.arity === 1 ? "monad" : "dyad"}>`;
    if (val.shape[0] === 0) return `[]`;
    if (val.shape.length === 1 && val.data.every((v) => v.kind === "character")) {
        return JSON.stringify(String.fromCodePoint(...val.data.map((v) => v.data)));
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
            .map((_, i) => N(i)),
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
function sub(x: Val, y: Val): Val {
    if (x.kind === "array" || y.kind === "array") return each(sub, x, y);
    if (y.kind !== "number")
        throw new Error(`Cannot subtract non-number from ${x.kind}`);
    if (x.kind === "function") throw new Error(`Cannot subtract a function`);
    return { kind: x.kind, data: x.data - y.data };
}
function mul(x: Val, y: Val): Val {
    if (x.kind === "array" || y.kind === "array") return each(mul, x, y);
    if (x.kind !== "number" || y.kind !== "number")
        throw new Error(`Cannot multiply ${x.kind} and ${y.kind}`);
    return N(x.data * y.data);
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
function floor(x: Val) {
    if (x.kind === "array") return each(floor, x);
    if (x.kind !== "number") throw new Error(`Cannot take floor of ${x.kind}`);
    return N(Math.floor(x.data));
}
function round(x: Val) {
    if (x.kind === "array") return each(round, x);
    if (x.kind !== "number") throw new Error(`Cannot round ${x.kind}`);
    return N(Math.round(x.data));
}
function ceil(x: Val) {
    if (x.kind === "array") return each(ceil, x);
    if (x.kind !== "number") throw new Error(`Cannot take ceiling of ${x.kind}`);
    return N(Math.ceil(x.data));
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
function mEach(y: Val) {
    if (y.kind !== "function")
        throw new Error("Operand to each must be a function");
    return F(y.arity, (...x) => each(y.data, ...x));
}
function reduce(y: Val) {
    if (y.kind !== "function" || y.arity !== 2)
        throw new Error("Operand to reduce must be a dyadic function");
    return F(1, (x) => {
        if (x.kind !== "array") throw new Error(`Cannot reduce ${x.kind}`);
        const c = cells(x, -1) as Val & { kind: "array" };
        return c.data.reduce((acc, val) => y.data(acc, val));
    });
}
function scan(y: Val) {
    if (y.kind !== "function" || y.arity !== 2)
        throw new Error("Operand to scan must be a dyadic function");
    return F(1, (x) => {
        if (x.kind !== "array") throw new Error(`Cannot scan ${x.kind}`);
        const c = cells(x, -1) as Val & { kind: "array" };
        for (let i = 1, acc = c.data[0]; i < c.shape[0]; i++) {
            c.data[i] = acc = y.data(acc, c.data[i]);
        }
        return c;
    });
}
function fMatch(x: Val, y: Val): Val {
    if (x.kind !== y.kind) return N(0);
    if (x.kind !== "array") return N(x.data === y.data ? 1 : 0);
    if (y.kind !== "array") throw new Error("unreachable");
    if (!match(x.shape, y.shape)) return N(0);
    return N(x.data.every((v, i) => fMatch(v, y.data[i]).data) ? 1 : 0);
}
function noMatch(x: Val, y: Val) {
    return not(fMatch(x, y));
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
function length(y: Val) {
    return N(y.kind === "array" ? (y.shape[0] ?? 0) : 0);
}
function shape(y: Val) {
    if (y.kind !== "array") return A([0], []);
    return A([y.shape.length], y.shape.map(N));
}
function cat(x: Val, y: Val): Val {
    if (x.kind === "array" && y.kind === "array") {
        const [xsh, ysh] = [x, y].map((v) => v.shape);
        if (xsh.length === ysh.length + 1) return cat(x, A([1, ...ysh], y.data));
        if (xsh.length + 1 === ysh.length) return cat(A([1, ...xsh], x.data), y);
        if (xsh.length !== ysh.length || !match(xsh.slice(1), ysh.slice(1)))
            throw new Error("Arguments to catenate must have matching cells");
        x.shape[0] += y.shape[0];
        x.data.push(...y.data);
        return x;
    } else if (x.kind === "array") {
        const sh = [1, ...x.shape.slice(1)];
        const d = Array(sh.reduce((a, b) => a * b))
            .fill(0)
            .map((_) => y);
        return cat(x, A(sh, d));
    } else if (y.kind === "array") {
        const sh = [1, ...y.shape.slice(1)];
        const d = Array(sh.reduce((a, b) => a * b))
            .fill(0)
            .map((_) => x);
        return cat(A(sh, d), y);
    } else {
        return A([2], [x, y]);
    }
}
function pair(x: Val, y: Val) {
    return A([2], [x, y]);
}

type GlyphKind = `${"mon" | "dy"}adic ${"function" | "modifier"}`;
type Glyph = { alias: string; kind: GlyphKind; def: (...v: Val[]) => Val };
export const glyphs: Record<string, Glyph> = {
    "⍳": { alias: "iot", kind: "monadic function", def: iota },
    "=": { alias: "eq", kind: "dyadic function", def: eq },
    "≠": { alias: "ne", kind: "dyadic function", def: ne },
    ">": { alias: "grt", kind: "dyadic function", def: gt },
    "≥": { alias: "gte", kind: "dyadic function", def: ge },
    "<": { alias: "les", kind: "dyadic function", def: lt },
    "≤": { alias: "lte", kind: "dyadic function", def: le },
    "+": { alias: "add", kind: "dyadic function", def: add },
    "-": { alias: "sub", kind: "dyadic function", def: sub },
    "×": { alias: "mul", kind: "dyadic function", def: mul },
    "÷": { alias: "div", kind: "dyadic function", def: div },
    "%": { alias: "mod", kind: "dyadic function", def: mod },
    "⌊": { alias: "flo", kind: "monadic function", def: floor },
    "⁅": { alias: "rou", kind: "monadic function", def: round },
    "⌈": { alias: "cei", kind: "monadic function", def: ceil },
    "≡": { alias: "mat", kind: "dyadic function", def: fMatch },
    "≢": { alias: "nmt", kind: "dyadic function", def: noMatch },
    "⧻": { alias: "len", kind: "monadic function", def: length },
    "△": { alias: "sha", kind: "monadic function", def: shape },
    ",": { alias: "par", kind: "dyadic function", def: pair },
    "⍪": { alias: "cat", kind: "dyadic function", def: cat },
    "¨": { alias: "eac", kind: "monadic modifier", def: mEach },
    "/": { alias: "red", kind: "monadic modifier", def: reduce },
    "\\": { alias: "sca", kind: "monadic modifier", def: scan },
    "⊢": { alias: "lft", kind: "dyadic function", def: (_, y) => y },
    "⊣": { alias: "rgt", kind: "dyadic function", def: (x, _) => x },
    "⋅": { alias: "id", kind: "monadic function", def: (x) => x },
    "∘": { alias: "jot", kind: "dyadic modifier", def: compose },
};
export function getGlyphByAlias(alias: string) {
    return Object.keys(glyphs).find((key) => glyphs[key].alias === alias);
}
