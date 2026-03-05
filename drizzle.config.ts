import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/polaris_management.db",
  },
  verbose: true,
  strict: true,
} satisfies Config;
