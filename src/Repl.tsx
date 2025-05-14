import { createSignal, For } from "solid-js";
import { Visitor, Token, lex, Parser } from "./lang";
import { display, glyphs } from "./primitives";
import { Component } from "solid-js";

export const Highlight: Component<{ tokens: readonly Token[] }> = (props) => {
  return props.tokens.map(({ kind, image }) => {
    switch (kind) {
      case "glyph":
        const glyph = glyphs[image];
        const color = {
          "monadic function": "text-lime-400",
          "dyadic function": "text-emerald-400",
          "monadic modifier": "text-yellow-400",
          "dyadic modifier": "text-purple-300",
        }[glyph.kind];
        return (
          <span title={glyph.alias} class={color}>
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

type Result = {
  source: string;
  tokens: Token[] | null;
  output: string | null;
  error: string | null;
};

export function Repl() {
  const [results, setResults] = createSignal<Result[]>([]);
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
  process(`"Hello, world!"`);
  let textarea!: HTMLTextAreaElement;
  return (
    <div class="bg-black/20 font-mono p-4 pt-1 flex flex-col rounded-md">
      <div class="flex gap-4 items-center">
        <h2 class="mr-auto">REPL</h2>
        <button
          class="text-2xl cursor-pointer"
          title="Configuration options"
          onClick={() => setResults([])}
        >
          <span class="material-symbols-outlined" title="clear repl">
            backspace
          </span>
        </button>
        <button
          class="text-2xl cursor-pointer"
          title="Configuration options"
          onClick={() => setSettingsOpen((b) => !b)}
        >
          <span class="material-symbols-outlined" title="toggle settings menu">
            settings
          </span>
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
        <ul class="flex flex-col-reverse h-full overflow-scroll">
          <For each={results()}>
            {(result) => (
              <li>
                <pre
                  class="pl-[8ch] min-w-max bg-teal-900/20 hover:bg-teal-900/50"
                  onClick={(e) =>
                    (textarea.value ||= e.currentTarget.textContent ?? "")
                  }
                >
                  <code>
                    {result.tokens ? (
                      <Highlight tokens={result.tokens} />
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
          class="rounded-sm ring-green-500 focus:outline-0 ring-1 focus:ring-2
                 resize-none overflow-hidden"
          rows="1"
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && !ev.shiftKey) {
              ev.preventDefault();
              process(textarea.value);
              // todo: make clearing the textarea a configurable option
              textarea.value = "";
            }
          }}
          onInput={() =>
            (textarea.parentElement!.dataset.value = textarea.value)
          }
        ></textarea>
      </div>
    </div>
  );
}
