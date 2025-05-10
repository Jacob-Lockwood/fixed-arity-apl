import { glyphs, dataBySymbol, Val, F } from "./primitives";

const patterns = {
  string: /^"(\\.|[^"$])*"/,
  number: /^[`¯]?\d+(\.\d+)?/,
  character: /^'(\\.|[^'])*'/,
  identifier: /^[A-Z][A-Za-z]*/,
  comment: /^#.*/m,
  space: /^ +/,
  newline: /^$/m,
  openParen: /^\(/,
  closeParen: /^\)/,
  binding: /^[:←][012⓪①②]?/,
  // openCurly: /{/y, closeCurly: /}/y, openSquare: /\[/y, closeSquare: /\]/y,
  glyphname: /^[a-z]+/,
  glyph: /^./,
} as const;

export type TokenKind = keyof typeof patterns;
export type Token = {
  kind: TokenKind;
  image: string;
  line: number;
};
export function lex(code: string) {
  const tokens: Token[] = [{ kind: "newline", image: "", line: 0 }];
  let line = 1;
  loop: while (code.length) {
    for (const key in patterns) {
      const kind = key as TokenKind;
      const regex = patterns[kind];
      const execResult = regex.exec(code);
      if (!execResult) continue;
      const [match] = execResult;
      if (
        kind === "glyph" &&
        !Object.values(glyphs).some(({ glyph }) => match === glyph)
      ) {
        throw new Error(`Unrecognized glyph ${match} on line ${line}`);
      }
      if (kind === "binding") {
        const image = match.replace(":", "←").replace(/\d/, (a) => "⓪①②"[+a]);
        tokens.push({ kind, image, line });
      } else if (kind === "number") {
        tokens.push({ kind, image: match.replace("`", "¯"), line });
      } else if (kind === "glyphname") {
        let i = 0;
        while (i < match.length) {
          const two = match.slice(i, i + 2);
          const three = match.slice(i, i + 3);
          let image: string;
          if (two in glyphs) {
            image = glyphs[two].glyph;
            i += 2;
          } else {
            const name = Object.keys(glyphs).find(
              (name) => name.slice(0, 3) === three
            );
            if (!name)
              throw new Error(
                `Unrecognized glyph name ${match.slice(i)} on line ${line}`
              );
            image = glyphs[name].glyph;
            i += 3;
          }
          tokens.push({ kind: "glyph", image, line });
        }
      } else {
        tokens.push({ kind, image: match, line });
        line += match.split("\n").length - 1;
      }
      code = code.slice(match.length);
      continue loop;
    }
    throw new Error(
      `Lexing error at line ${line} -- code: ` + code.slice(0, 10)
    );
  }
  return tokens;
}

type AstNode =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "character"; value: number }
  | { kind: "monadic modifier"; modifier: string; fn: AstNode }
  | { kind: "dyadic modifier"; modifier: string; fns: [AstNode, AstNode] }
  | { kind: "reference"; name: string }
  | { kind: "glyph reference"; name: string }
  | { kind: "binding"; name: string; declaredArity: number; value: AstNode }
  | { kind: "expression"; values: AstNode[] };
export class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}
  tok() {
    let tok = this.tokens[this.i];
    while (tok?.kind === "newline") {
      this.i++;
      tok = this.tokens[this.i];
    }
    return tok;
  }
  primary(): AstNode | void {
    const tok = this.tok();
    if (!tok) return;
    if (tok.kind === "number") {
      this.i++;
      return { kind: "number", value: Number(tok.image.replace("¯", "-")) };
    } else if (tok.kind === "string") {
      this.i++;
      return { kind: "string", value: tok.image.slice(1, -1) };
    } else if (tok.kind === "character") {
      this.i++;
      const str = tok.image.slice(1, -1) as string;
      if (str.length !== 1)
        throw new Error(
          `Parsing error on line ${tok.line} - character literal must be one` +
            `character: ${tok.image}`
        );
      return {
        kind: "character",
        value: str.codePointAt(0)!,
      };
    } else if (tok.kind === "identifier") {
      this.i++;
      return { kind: "reference", name: tok.image };
    } else if (tok.kind === "openParen") {
      return this.parenthesized();
    } else if (tok.kind === "glyph") {
      this.i++;
      const [name, { glyph, kind }] = dataBySymbol(tok.image);
      if (kind.includes("function")) {
        return { kind: "glyph reference", name };
      } else {
        throw new Error(
          `Parsing error on line ${tok.line} - expected function glyph but ` +
            `got modifier: ${glyph}`
        );
      }
    }
  }
  parenthesized(): AstNode {
    this.i++;
    const expr = this.expression();
    const tok = this.tokens[this.i];
    if (tok?.kind !== "closeParen") {
      throw new Error(
        `Parsing error on line ${tok.line} - expected closing parenthesis but ` +
          `got ${tok.kind}: ${tok.image}`
      );
    }
    this.i++;
    return expr;
  }
  monadicModifierStack(p: AstNode | void): AstNode | void {
    if (!p) return;
    while (true) {
      const tok = this.tokens[this.i];
      if (tok?.kind !== "glyph") return p;
      const [name, data] = dataBySymbol(tok.image);
      if (data.kind !== "monadic modifier") return p;
      this.i++;
      p = { kind: "monadic modifier", modifier: name, fn: p };
    }
  }
  modifierExpression(): AstNode | void {
    let p = this.primary();
    if (!p) return;
    while (true) {
      p = this.monadicModifierStack(p);
      const tok = this.tokens[this.i];
      if (tok?.kind !== "glyph") return p;
      const [name, data] = dataBySymbol(tok.image);
      if (data.kind !== "dyadic modifier") return p;
      this.i++;
      const r = this.primary();
      if (!r) {
        throw new Error(
          `Parsing error on line ${tok.line} - expected right argument to ` +
            `dyadic modifier but got ${tok.kind}: ${tok.image}`
        );
      }
      p = { kind: "dyadic modifier", modifier: name, fns: [p!, r] };
    }
  }
  expression(): AstNode {
    const values: AstNode[] = [];
    while (true) {
      const m = this.modifierExpression();
      if (!m) break;
      values.push(m);
    }
    return { kind: "expression", values };
  }
  binding(): AstNode | void {
    const tok1 = this.tok();
    if (tok1?.kind !== "identifier") return;
    const tok2 = this.tokens[this.i + 1];
    if (tok2?.kind !== "binding") return;
    this.i += 2;
    const declaredArity = "⓪①②".indexOf(tok2.image[1]);
    return {
      kind: "binding",
      name: tok1.image,
      declaredArity,
      value: this.expression(),
    };
  }
  program() {
    const statements: AstNode[] = [];
    while (this.i < this.tokens.length) {
      const b = this.binding();
      if (b) {
        statements.push(b);
      } else {
        const e = this.expression();
        if (!e) return statements;
        statements.push(e);
      }
    }
    return statements;
  }
}

//* Visit tree
//* if node is binding:
//* - if arity is declared, set it
//* - push name to stack
//* - visit value
//* - set value
export class Visitor {
  visit(node: AstNode): Val {
    if (node.kind === "number" || node.kind === "character") {
      return { kind: node.kind, data: node.value };
    }
    if (node.kind === "string") {
      return {
        kind: "array",
        shape: [node.value.length],
        data: [...node.value].map<Val>((c) => ({
          kind: "character",
          data: c.codePointAt(0)!,
        })),
      };
    }
    if (node.kind === "glyph reference") {
      const g = glyphs[node.name];
      return F(g.kind === "monadic function" ? 1 : 2, g.def);
    }
    if (node.kind === "monadic modifier") {
      return glyphs[node.modifier].def(this.visit(node.fn));
    }
    if (node.kind === "dyadic modifier") {
      return glyphs[node.modifier].def(...node.fns.map((f) => this.visit(f)));
    }
    if (node.kind === "expression") {
      const tines = node.values.map((n) => this.visit(n));
      // for (const tine of tines) console.log(tine);
      type Cmp = (r: Val & { kind: "function" }) => Val & { kind: "function" };
      const fns: Cmp[] = [];
      function fork(l: Val, g: Val & { kind: "function" }): Cmp {
        const isF = l.kind === "function";
        return (r) => {
          const arity = Math.max(r.arity, isF ? l.arity : 0);
          return F(arity, (...v) =>
            g.data(isF ? l.data(...v) : l, r.data(...v))
          );
        };
      }
      function atop(g: Val & { kind: "function" }): Cmp {
        console.log("atop", g);
        if (g.arity === 2)
          return (r) => F(r.arity, (x, y) => g.data(x, r.data(x, y)));
        return (r) => F(r.arity, (...v) => g.data(r.data(...v)));
      }
      for (let i = 0; i < tines.length; i++) {
        const t = tines[i];
        const n = tines[i + 1];
        if (n?.kind === "function" && n.arity === 2) {
          i++;
          fns.push(fork(t, n));
        } else if (t.kind === "function") {
          fns.push(atop(t));
        } else if (i === tines.length - 1) {
          const fn = fns.reduceRight(
            (r, fn) => fn(r),
            F(0, () => t)
          );
          if (fn.arity === 0) return fn.data();
          return fn;
        } else throw new Error("Cannot have nilad outside of fork");
      }
      return fns.reduceRight(
        (r, fn) => fn(r),
        F(1, (x) => x)
      );
    }
    throw new Error(
      "Error in 'visit' -- node: " + "\n" + JSON.stringify(node, null, 2)
    );
  }
}
