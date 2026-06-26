import { Hono } from "hono";
import { createPages } from "blokd/hono";
import routes from "virtual:blokd/routes";

const app = new Hono();

app.get("/api/health", c => {
  return c.json({ ok: true });
});

app.route(
  "/",
  createPages({
    routes,
    entryClient: "/src/entry-client.ts"
  })
);

export default app;