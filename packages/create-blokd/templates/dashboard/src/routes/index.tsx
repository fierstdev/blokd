import { Island, on } from "blokd";

export const meta = () => ({
  title: "Dashboard | Blokd App",
  description: "A dashboard starter using route-local islands."
});

export default function Home() {
  return (
    <section>
      <h1>Dashboard</h1>

      <p>
        Interactive controls are isolated to the dashboard route. Static routes
        still ship no client runtime.
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

      <Island name="status" state={{ text: "Queue healthy" }}>
        <button
          type="button"
          onClick={on("/src/resumables/status.ts#refresh")}
        >
          Refresh status
        </button>
      </Island>
    </section>
  );
}
