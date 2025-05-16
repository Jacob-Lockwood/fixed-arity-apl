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
        tokens.filter((x) => !"whitespace,comment".includes(x.kind)),
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
    <div class="sticky top-10 flex flex-col gap-2">
      <div class="flex flex-col rounded-md bg-black/20 p-4 pt-1 font-mono">
        <div class="flex items-center gap-4">
          <h2 class="mr-auto">REPL</h2>
          <button
            class="cursor-pointer text-2xl"
            title="Configuration options"
            onClick={() => setResults([])}
          >
            <span class="material-symbols-outlined" title="clear repl">
              backspace
            </span>
          </button>
          <button
            class="cursor-pointer text-2xl"
            title="Configuration options"
            onClick={() => setSettingsOpen((b) => !b)}
          >
            <span
              class="material-symbols-outlined"
              title="toggle settings menu"
            >
              settings
            </span>
          </button>
        </div>
        <div class="flex h-80 flex-col">
          <div
            class="w-full border-b-2 border-emerald-500 p-4"
            classList={{ hidden: !settingsOpen() }}
          >
            <p class="mb-1 text-sm italic">Settings</p>
            <div class="flex gap-4">
              <label for="clear">Clear prompt on enter</label>
              <input type="checkbox" name="clear" id="clear" />
            </div>
          </div>
          <ul class="flex h-full flex-col-reverse overflow-scroll">
            <For each={results()}>
              {(result) => (
                <li>
                  <pre
                    class="min-w-max bg-teal-900/20 pl-[8ch] hover:bg-teal-900/50"
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
        <div class="-m-2 mt-auto grid overflow-x-scroll p-2" id="wrapper">
          <textarea
            id="code-input"
            ref={textarea}
            aria-label="REPL input line"
            class="resize-none overflow-hidden rounded-sm ring-1 ring-green-500 focus:ring-2 focus:outline-0"
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
      <div class="flex flex-wrap text-2xl">
        {Object.entries(glyphs).map(([glyph, data]) => (
          <button
            class="group hocus:bg-emerald-800 block cursor-pointer rounded-t-sm focus:outline-0"
            onClick={() => {
              textarea.focus();
              textarea.setRangeText(glyph);
              textarea.selectionStart++;
            }}
          >
            <span class="-z-10 p-2">{glyph}</span>
            <p class="group-hocus:block absolute z-10 hidden w-max rounded-sm rounded-tl-none bg-emerald-800 p-1 text-sm">
              alias: {data.alias} <br /> {data.kind}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
