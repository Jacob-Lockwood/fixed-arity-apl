import {
  createSignal,
  For,
  ParentComponent,
  Show,
  type Component,
} from "solid-js";
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
          "dyadic function": "text-emerald-400",
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
        return <span class="text-green-300">{image}</span>;
      case "number":
        return <span class="text-orange-400">{image}</span>;
      default:
        return <span>{image}</span>;
    }
  });
};

const Kbd: ParentComponent = (props) => (
  <kbd class="bg-green-900 px-1 font-[inherit] border-b-4 rounded-sm border-green-700">
    {props.children}
  </kbd>
);

export default function App() {
  return (
    <div
      class="p-5 sm:p-10 lg:py-20 text-emerald-300 selection:bg-green-800 flex flex-col
             mx-auto md:w-3/4 min-h-screen bg-emerald-950/50"
    >
      <div class="lg:flex gap-10 ">
        <div class="lg:w-2/5 max-w-prose mb-10">
          <img
            class="w-30 h-30 mx-auto"
            src="/APL_FIX.svg"
            alt="FIX APL logo."
          />
          <h1 class="text-2xl text-center text-emerald-200">Fixed-arity APL</h1>
          <p class="italic text-center mb-10">
            A simple APL derivative, built on fixed-arity functions
          </p>
          <details>
            <summary class="text-emerald-500 underline underline-offset-2">
              Why fixed arity
            </summary>
            <p class="mt-1">
              I've written about the motivations for fixed-arity to a greater
              extent{" "}
              <a href="https://example.com" class="text-green-500 underline">
                here
              </a>
              , but to summarize the main points:
            </p>
            <ul class="list-disc pl-5">
              <li>
                <p>
                  The overloading of glyphs to have different meanings when
                  called monadically versus dyadically can be confusing. This is
                  not universally true, and many glyph-pairings just feel
                  natural, but others don't. Marshall Lochbaum has written about
                  this{" "}
                  <a
                    href="https://mlochbaum.github.io/BQN/commentary/overload.html"
                    class="text-green-500 underline"
                  >
                    here
                  </a>{" "}
                  in the context of BQN.
                </p>
              </li>
              <li>
                <p>
                  In Uiua, functions having fixed arity lets modifiers have
                  different behavior depending on the arities of their operands.
                </p>
              </li>
            </ul>
          </details>
          <details>
            <summary class="text-emerald-500 underline underline-offset-2">
              How to use this page
            </summary>
            <p class="text-emerald-300 mt-1">
              Click in the REPL box to enter statements. Glyphs can be entered
              by typing in the appropriate alias given in the documentation. Use{" "}
              <Kbd>Shift+Enter</Kbd> to enter a newline instead of entering the
              code. Click on a previously entered segment to paste it into the
              textbox.
            </p>
          </details>
        </div>
        <main class="flex-grow max-w-[80ch] mx-auto">
          <Repl />
        </main>
      </div>
      <footer class="text-center mt-60 text-emerald-600">
        Created by{" "}
        <a href="https://github.com/Jacob-Lockwood" class="underline">
          Jacob Lockwood
        </a>
        .
      </footer>
    </div>
  );
}

function Repl() {
  const [results, setResults] = createSignal<Result[]>([
    /* {
    // source: `"Hello"`
  } */
  ]);
  const [settingsOpen, setSettingsOpen] = createSignal(false);

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
    setResults((results) => [{ source, tokens, output, error }, ...results]);
  };
  let textarea!: HTMLTextAreaElement;
  return (
    <div
      class="h-max overflow-y-scroll bg-black/20 font-mono p-4 pt-1 flex
                   flex-col gap-2 rounded-md selection:bg-green-950"
    >
      <div class="flex justify-between items-center">
        <h2 class="text-sm">REPL</h2>
        <button
          class="text-2xl cursor-pointer"
          title="Configuration options"
          onClick={() => setSettingsOpen((b) => !b)}
        >
          ⚙
        </button>
      </div>
      <div class="h-80 flex flex-col">
        <div
          class="border-b-2 border-emerald-500 w-full p-4"
          classList={{ hidden: !settingsOpen() }}
        >
          <p class="text-sm italic mb-1">Settings</p>
          <div class="flex gap-4">
            <label for="clear">Clear prompt on enter</label>
            <input type="checkbox" name="clear" id="clear" />
          </div>
        </div>
        <ul class="flex flex-col-reverse h-full w-full overflow-scroll">
          <For each={results()}>
            {(result) => (
              <li>
                <pre
                  class="pl-[8ch] hover:bg-teal-950/50"
                  onClick={(e) =>
                    (textarea.value ||= e.currentTarget.textContent ?? "")
                  }
                >
                  <code>
                    {result.tokens ? (
                      <Highlight tokens={result.tokens!} />
                    ) : (
                      result.source
                    )}
                  </code>
                </pre>
                {result.output ? (
                  <pre class="text-green-300">{result.output}</pre>
                ) : (
                  <pre class="text-red-300">{result.error}</pre>
                )}
              </li>
            )}
          </For>
        </ul>
      </div>
      <div class="grid overflow-x-scroll p-2 -m-2 mt-auto" id="wrapper">
        <textarea
          id="code-input"
          ref={textarea}
          aria-label="REPL input line"
          class="w-full rounded-sm ring-green-500
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
  );
}
