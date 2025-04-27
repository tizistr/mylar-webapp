import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      "@components": resolve(__dirname, "./components"),
      "@api": resolve(__dirname, "./api"),
    },
  },
  optimizeDeps: {
    include: [
      "dayjs",
      "dayjs/plugin/utc",
      "dayjs/plugin/timezone",
      "@supabase/supabase-js",
    ],
  },
});
