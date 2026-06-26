import { defineConfig } from "vite";
import { blokd } from "blokd/vite";

export default defineConfig({
  plugins: [
    blokd({
      routesDir: "src/routes",
      clientEntry: "/src/entry-client.ts"
    })
  ]
});