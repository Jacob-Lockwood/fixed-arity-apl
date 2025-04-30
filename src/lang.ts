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
  binding: /^[:←]/,
  // openCurly: /{/y, closeCurly: /}/y, openSquare: /\[/y, closeSquare: /\]/y,
  glyphname: /^[a-z]+/,
  glyph: /^./,
} as const;

export type Token<T extends keyof typeof patterns = keyof typeof patterns> = {
  kind: T;
  image: string;
  line: number;
};

const glyphs = {
  eq: "=",
  ne: "≠",
  gt: ">",
  lt: "<",
  ge: "≥",
  le: "≤",
  each: "¨",
} as const;

export function lex(code: string) {
  const tokens: Token[] = [];
  let line = 0;
  loop: while (code.length) {
    for (const key in patterns) {
      const kind = key as keyof typeof patterns;
      const regex = patterns[kind];
      const execResult = regex.exec(code);
      if (!execResult) continue;
      const [match] = execResult;
      if (kind === "binding") {
        tokens.push({ kind, image: "←", line });
      } else if (kind === "number") {
        tokens.push({ kind, image: match.replace("`", "¯"), line });
      } else if (kind === "glyphname") {
        let i = 0;
        while (i < match.length) {
          const two = match.slice(i, i + 2);
          const three = match.slice(i, i + 3);
          let image: string;
          if (two in glyphs) {
            image = glyphs[two as keyof typeof glyphs];
            i += 2;
          } else if (three in glyphs) {
            image = glyphs[three as keyof typeof glyphs];
            i += 3;
          } else {
            throw new Error("Unrecognized glyph name" + match.slice(i));
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
      `Lexing error at line ${line + 1} -- code: ` + code.slice(0, 10)
    );
  }
  return tokens;
}

// type AstNode = {
//   kind: "binding" | "number" | "string" | "monadic modifier" | "dyadic modifier";
//   children: AstNode[]
// }
type AstNode =
  | void
  | { kind: "number"; value: number }
  | { kind: "string"; value: string };
class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}
  primary(): AstNode {
    const tok = this.tokens[this.i];
    if (tok.kind === "number") {
      this.i++;
      return { kind: "number", value: Number(tok.image.replace("¯", "-")) };
    } else if (tok.kind === "string") {
      this.i++;
      return { kind: "string", value: tok.image.slice(0, -1) };
    } else if (tok.kind === "openParen") {
      return this.parenthesized();
    } else if (tok.kind === "glyph") {
      // if (Object.values<string>(glyphs).includes(tok.image)) {}
      //TODO organize glyphs into modifiers and functions by arity
    }
  }
  parenthesized(): AstNode {
    this.i++;
    const expr = this.expression();
    const tok = this.tokens[this.i];
    if (tok.kind !== "closeParen") {
      throw new Error(
        `Parsing error on line ${tok.line} - expected closing parenthesis but ` +
          `got ${tok.kind}: ${tok.image}`
      );
    }
    this.i++;
    return expr;
  }
  expression(): AstNode {}
}
