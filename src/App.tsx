import { createSignal, Index } from "solid-js";
import { lex } from "./lang";

type Result = { code: string; output: string };

function App() {
  const [results, setResults] = createSignal<Result[]>([]);
  const process = (text: string) =>
    setResults((results) => [
      ...results,
      { code: text.replace(/test/g, "TEST"), output: "ay" },
    ]);
  let textarea!: HTMLTextAreaElement;

  // console.log(lex(`"test"12le`));

  return (
    <div class="lg:flex h-screen p-10 lg:p-20 gap-10 bg-blue-100">
      <div class="flex-grow max-w-prose lg:w-md mb-10">
        <h1 class="text-lg mb-10">Fixed-arity APL Demo</h1>
        <details>
          <summary class="text-slate-600 underline underline-offset-2">
            How to use this REPL
          </summary>
          <p class="text-slate-800 mt-1">
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
        <div class="h-max overflow-y-scroll bg-blue-200 font-mono p-4 flex flex-col gap-2">
          <Index each={results()}>
            {(result) => (
              <>
                <pre
                  class="pl-[8ch] text-blue-700 hover:underline"
                  onClick={() => (textarea.value ||= result().code)}
                >
                  {result().code}
                </pre>
                <pre>{result().output}</pre>
              </>
            )}
          </Index>
          <textarea
            ref={textarea}
            class="bg-blue-300 w-full h-max p-1 pl-[8ch]"
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
