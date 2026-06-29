#!/usr/bin/env node

import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createServer as createViteServer } from "vite";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 5173);

let handleRequest = (_req, res) => {
  res.statusCode = 503;
  res.end("Dev server is starting");
};

const httpServer = createServer((req, res) => {
  handleRequest(req, res);
});

const vite = await createViteServer({
  appType: "custom",
  server: {
    middlewareMode: true,
    hmr: {
      server: httpServer
    }
  }
});

handleRequest = async (req, res) => {
  vite.middlewares(req, res, async () => {
    try {
      const mod = await vite.ssrLoadModule("/src/server.ts");
      const app = mod.default;

      if (!app || typeof app.fetch !== "function") {
        throw new Error("src/server.ts must default-export a Hono app.");
      }

      const request = toWebRequest(req);
      const response = await app.fetch(request);

      await writeWebResponse(res, response);
    } catch (error) {
      vite.ssrFixStacktrace(error);

      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.stack ?? error.message : String(error));
    }
  });
};

httpServer.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "localhost" : host;

  console.log("");
  console.log(`  Blokd dev server`);
  console.log(`  Local:   http://${displayHost}:${port}/`);
  console.log("");
});

function toWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] ?? "http";
  const hostHeader = req.headers.host ?? `${host}:${port}`;
  const url = `${protocol}://${hostHeader}${req.url ?? "/"}`;

  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const init = {
    method: req.method ?? "GET",
    headers
  };

  if (init.method !== "GET" && init.method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function writeWebResponse(res, response) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const stream = Readable.fromWeb(response.body);
  stream.pipe(res);
}