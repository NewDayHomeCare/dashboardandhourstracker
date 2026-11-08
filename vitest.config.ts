import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}},test:{include:["src/**/*.test.ts"],env:{NEXT_PUBLIC_HOMECARE_DEMO_DATE:"2026-11-07"}}});
