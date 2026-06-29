import { Island, on } from "blokd";

export const meta = () => ({
  title: "Blokd App",
  description: "A minimal Blokd application."
});

export default function Home() {
  return (
    <section>
      <h1>Blokd App</h1>

      <p>
        This page demonstrates resumable islands. Blokd does not hydrate the
        whole component tree; client behavior is attached explicitly.
      </p>

      <Island name="counter" state={{ count: 0 }}>
        <button
          type="button"
          onClick={on("/src/resumables/counter.ts#increment")}
        >
          Count: 0
        </button>
      </Island>

      <Island name="demo-island" state={{ text: "Hello from Blokd" }}>
        <button
          type="button"
          onClick={on("/src/resumables/demo.ts#show")}
        >
          Run resumable handler
        </button>
      </Island>
    </section>
  );
}
