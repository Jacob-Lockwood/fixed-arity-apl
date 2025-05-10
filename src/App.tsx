import logo from "/APL_FIX.svg?url";
import { createSignal, Index, ParentComponent, type Component } from "solid-js";
import { lex, Parser, Visitor, type Token } from "./lang";
import { dataBySymbol, display } from "./primitives";

type Result = {
  source: string;
  tokens: Token[] | null;
  output: string | null;
  error: string | null;
};

const Highlight: Component<{ tokens: readonly Token[] }> = (props) => {
  return props.tokens.map(({ kind, image }) => {
    switch (kind) {
      case "glyph":
        const [name, glyph] = dataBySymbol(image);
        const color = {
          "monadic function": "text-lime-400",
          "dyadic function": "text-sky-400",
          "monadic modifier": "text-yellow-400",
          "dyadic modifier": "text-purple-300",
        }[glyph.kind];
        return (
          <span title={name} class={color}>
            {image}
          </span>
        );
      case "identifier":
        return (
          <span class="identifier" data-name={image}>
            {image}
          </span>
        );
      case "string":
        return <span class="text-cyan-300">{image}</span>;
      case "number":
        return <span class="text-orange-400">{image}</span>;
      default:
        return <span>{image}</span>;
    }
  });
};

const Kbd: ParentComponent = (props) => (
  <kbd class="bg-blue-900 px-1 font-[inherit] border-b-4 rounded-sm border-blue-700">
    {props.children}
  </kbd>
);

export default function App() {
  const [results, setResults] = createSignal<Result[]>([]);
  const visitor = new Visitor();
  const process = (source: string) => {
    let tokens: Token[] | null = null;
    let output: string | null = null;
    let error: string | null = null;
    try {
      tokens = lex(source);
      const e = new Parser(
        tokens.filter((x) => !"whitespace,comment".includes(x.kind))
      ).expression()!;
      output = display(visitor.visit(e));
    } catch (e) {
      error = e + "";
      console.error(e);
    }
    setResults((results) => [...results, { source, tokens, output, error }]);
  };
  let textarea!: HTMLTextAreaElement;
  return (
    <div
      class="h-screen p-10 lg:p-20 bg-sky-950 text-sky-200 selection:bg-blue-800
             font-[Uiua386,TinyAPL386]"
    >
      <div class="lg:flex gap-10 max-w-6xl mx-auto">
        <div class="flex-grow max-w-prose lg:w-md mb-10">
          <img class="w-30 mx-auto" src={logo} />
          <h1 class="text-2xl text-center">Fixed-arity APL Demo</h1>
          <p class="italic text-center mb-10">
            APL, reimagined with fixed-arity function
          </p>
          <details>
            <summary class="text-sky-500 underline underline-offset-2">
              How to use this demo
            </summary>
            <p class="text-sky-300 mt-1">
              Click in the REPL box to enter statements. Glyphs can be entered
              by typing in the appropriate alias given in the documentation. Use{" "}
              <Kbd>Shift+Enter</Kbd> to enter a newline instead of entering the
              code. Click on a previously entered segment to paste it into the
              textbox.
            </p>
          </details>
        </div>
        <main class="w-full max-w-[80ch]">
          <div
            class="h-max overflow-y-scroll bg-sky-900 font-mono p-4 pt-1 flex
                   flex-col gap-2 rounded-md selection:bg-blue-950"
          >
            <h2 class="text-sm text-sky-500">REPL</h2>
            <Index each={results()}>
              {(result) => (
                <>
                  <pre
                    class="pl-[8ch] hover:bg-blue-950/20"
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
            <div class="grid" id="wrapper">
              <textarea
                id="code-input"
                ref={textarea}
                class="w-full rounded-sm ring-blue-500
                     focus:outline-0 ring-1 focus:ring-2 
                     resize-none overflow-hidden"
                rows="1"
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    process(textarea.value);
                    // todo: make clearing the textarea a configurable option
                    // textarea.value = "";
                  }
                }}
                onInput={() =>
                  (textarea.parentElement!.dataset.value = textarea.value)
                }
              ></textarea>
            </div>
            <style>{`
            #wrapper::after {
              content: attr(data-value) " ";
              white-space: pre-wrap;
              visibility: hidden;
            }
            #code-input, #wrapper::after {
              padding: 1px;
              padding-left: 8ch;
              font: inherit;
              grid-area: 1 / 1 / 2 / 2;
            }
          `}</style>
          </div>
        </main>
      </div>
      <footer></footer>
    </div>
  );
}
