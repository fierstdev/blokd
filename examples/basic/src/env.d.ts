declare module 'virtual:blokd/routes' {
  import type { RouteEntry } from 'blokd/hono';
  const routes: RouteEntry[];
  export default routes;
}

declare module 'virtual:blokd/islands' {
  import type { IslandComponent } from 'blokd';
  export const islands: IslandComponent[];
  export const dispose: () => void;
}
