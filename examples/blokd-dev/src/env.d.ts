declare module 'virtual:blokd/routes' {
  import type { RouteEntry } from 'blokd/hono';
  const routes: RouteEntry[];
  export default routes;
}

type Env = {
  ASSETS: Fetcher;
  ENVIRONMENT?: string;
};
