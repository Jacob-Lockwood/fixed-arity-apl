/*

1. break input into strings, identifiers, whitespace, and other
2. the "other" sections have text replacements performed on them
3. the "other" sections are properly lexed

*/

export type PrimitiveKind = `${"mon" | "dy"}adic ${"function" | "modifier"}`;
type GlyphKind = PrimitiveKind | "syntax";
export const glyphs = {
  eq: { name: "equal", glyph: "=", kind: "dyadic function" },
  ne: { name: "not equal", glyph: "≠", kind: "dyadic function" },
  grt: { name: "greater than", glyph: ">", kind: "dyadic function" },
  gte: { name: "greater or equal", glyph: "≥", kind: "dyadic function" },
  les: { name: "less than", glyph: "<", kind: "dyadic function" },
  lte: { name: "less or equal", glyph: "≤", kind: "dyadic function" },
  lft: { name: "left argument", glyph: "⊣", kind: "dyadic function" },
  rgt: { name: "right argument", glyph: "⊢", kind: "dyadic function" },
  id: { name: "identity", glyph: "⋅", kind: "monadic function" },
  add: { name: "add", glyph: "+", kind: "dyadic function" },
  sub: { name: "subtract", glyph: "-", kind: "dyadic function" },
  mul: { name: "multiply", glyph: "×", kind: "dyadic function" },
  div: { name: "divide", glyph: "÷", kind: "dyadic function" },
  mod: { name: "modulo", glyph: "%", kind: "dyadic function" },
  flo: { name: "floor", glyph: "⌊", kind: "monadic function" },
  rou: { name: "round", glyph: "⁅", kind: "monadic function" },
  cei: { name: "ceiling", glyph: "⌈", kind: "monadic function" },
  mat: { name: "match", glyph: "≡", kind: "dyadic function" },
  nmt: { name: "nomatch", glyph: "≢", kind: "dyadic function" },
  iot: { name: "iota", glyph: "⍳", kind: "monadic function" },
  len: { name: "length", glyph: "⧻", kind: "monadic function" },
  sha: { name: "shape", glyph: "△", kind: "monadic function" },
  fla: { name: "flat", glyph: ",", kind: "monadic function" },
  par: { name: "pair", glyph: "⍮", kind: "dyadic function" },
  cat: { name: "catenate", glyph: "⍪", kind: "dyadic function" },
  res: { name: "reshape", glyph: "⍴", kind: "dyadic function" },
  eac: { name: "each", glyph: "¨", kind: "monadic modifier" },
  bac: { name: "backward", glyph: "˜", kind: "monadic modifier" },
  slf: { name: "self", glyph: "˙", kind: "monadic modifier" },
  red: { name: "reduce", glyph: "/", kind: "monadic modifier" },
  sca: { name: "scan", glyph: "\\", kind: "monadic modifier" },
  jot: { name: "atop", glyph: "∘", kind: "dyadic modifier" },
  ov: { name: "over", glyph: "○", kind: "dyadic modifier" },
  ng: { name: "negate", glyph: "¯", kind: "monadic function" },
  "[": { name: "open array", glyph: "[", kind: "syntax" },
  "]": { name: "close array", glyph: "]", kind: "syntax" },
  "(": { name: "open parenthesis", glyph: "(", kind: "syntax" },
  ")": { name: "close parenthesis", glyph: ")", kind: "syntax" },
  "{": { name: "open list", glyph: "⟨", kind: "syntax" },
  "}": { name: "close list", glyph: "⟩", kind: "syntax" },
  ";": { name: "separator", glyph: "⋄", kind: "syntax" },
  ":": { name: "binding", glyph: "←", kind: "syntax" },
  _: { name: "ligature", glyph: "‿", kind: "syntax" },
} as const satisfies Record<
  string,
  { glyph: string; name: string; kind: GlyphKind }
>;
