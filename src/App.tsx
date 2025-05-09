import { createSignal, Index, type Component } from "solid-js";
import { lex, Parser, type Token, visit } from "./lang";
import { dataBySymbol, display, Val } from "./primitives";

type Result = {
  source: string;
  tokens: Token[] | null;
  output: string | null;
  error: string | null;
};

const colors = {
  string: "text-cyan-300",
  number: "text-orange-400",
  "monadic function": "text-lime-400",
  "dyadic function": "text-sky-400",
  "monadic modifier": "text-yellow-400",
  "dyadic modifier": "text-purple-300",
  identifier: "text-sky-400",
};

const Highlight: Component<{ tokens: readonly Token[] }> = (props) => {
  return props.tokens.map(({ kind, image }) => {
    switch (kind) {
      case "glyph":
        const [name, glyph] = dataBySymbol(image)!;
        return (
          <span title={name} class={colors[glyph.kind]}>
            {image}
          </span>
        );
      case "identifier":
        return (
          <span class="identifier" data-name={image}>
            {image}
          </span>
        );
      default:
        const c =
          kind + ` ${colors[kind as keyof typeof colors] ?? "text-sky-200"}`;
        return <span class={c}>{image}</span>;
    }
  });
};

function App() {
  const [results, setResults] = createSignal<Result[]>([]);
  const process = (source: string) => {
    let tokens: Token[] | null = null;
    let output: string | null = null;
    let error: string | null = null;
    try {
      tokens = lex(source);
      const e = new Parser(
        tokens.filter((x) => !"whitespace,comment".includes(x.kind))
      ).expression()!;
      const v = visit(e)! as Val & { kind: "function" };
      output = display(v);
    } catch (e) {
      error = e + "";
    }
    setResults((results) => [...results, { source, tokens, output, error }]);
  };
  let textarea!: HTMLTextAreaElement;
  return (
    <div class="lg:flex h-screen p-10 lg:p-20 gap-10 bg-sky-950 text-sky-200 font-[Uiua386,TinyAPL386]">
      <div class="flex-grow max-w-prose lg:w-md mb-10">
        <h1 class="text-lg mb-10">Fixed-arity APL Demo</h1>
        <details>
          <summary class="text-sky-500 underline underline-offset-2">
            How to use this REPL
          </summary>
          <p class="text-sky-300 mt-1">
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Cumque
            fugit aut, facilis ipsum distinctio nesciunt perferendis qui
            eligendi, quas ad nam repellat inventore, optio molestiae sed veniam
            debitis! Quia asperiores ea deleniti expedita fugit beatae culpa
            quos aperiam. Pariatur libero ducimus laboriosam quia at blanditiis
            aliquid voluptatibus voluptate, consequuntur aspernatur!
          </p>
        </details>
      </div>
      <main class="w-full max-w-6xl">
        <h2 class="text-lg mb-2">REPL</h2>
        <div class="h-max overflow-y-scroll bg-sky-900 font-mono p-4 flex flex-col gap-2">
          <Index each={results()}>
            {(result) => (
              <>
                <pre
                  class="pl-[8ch] hover:underline"
                  onClick={(e) =>
                    (textarea.value ||= e.currentTarget.textContent ?? "")
                  }
                >
                  <code>
                    {result().tokens ? (
                      <Highlight tokens={result().tokens!} />
                    ) : (
                      result().source
                    )}
                  </code>
                </pre>
                {result().output ? (
                  <pre class="text-blue-300">{result().output}</pre>
                ) : (
                  <pre class="text-red-300">{result().error}</pre>
                )}
              </>
            )}
          </Index>
          <textarea
            id="code-input"
            ref={textarea}
            class="w-full p-1 pl-[8ch] focus:outline-0 focus:ring-1 ring-blue-500"
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                process(textarea.value);
                textarea.value = "";
              }
            }}
          ></textarea>
        </div>
      </main>
    </div>
  );
}

export default App;
