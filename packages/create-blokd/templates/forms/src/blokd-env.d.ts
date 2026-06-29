declare module "virtual:blokd/routes" {
  const routes: import("blokd/hono").RouteEntry[];
  export default routes;
}

declare module "virtual:blokd/islands" {
  export const islands: import("blokd").IslandComponent[];
  export const dispose: () => void;
}
