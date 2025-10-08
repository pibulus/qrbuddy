import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  server: {
    hostname: "0.0.0.0", // Allow local network access for phone testing
    port: 8004,
  },
  plugins: [tailwind()],
});
