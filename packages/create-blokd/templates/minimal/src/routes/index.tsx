import { Island, resumable } from "blokd";

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
          data-count="0"
          onClick={resumable("/src/resumables/counter.ts#increment")}
        >
          Count: 0
        </button>
      </Island>

      <Island name="demo-island" state={{ message: "Hello from Blokd" }}>
        <button
          type="button"
          onClick={resumable("/src/resumables/demo.ts#sayHello")}
        >
          Run resumable handler
        </button>
      </Island>
    </section>
  );
}