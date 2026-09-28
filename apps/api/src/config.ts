import { z } from "zod";
export const config = z
  .object({
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
    SESSION_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_.-]+$/).max(100),
    PUBLIC_ORIGIN: z.url(),
    COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
    MAILPIT_HOST: z.literal("mailpit").default("mailpit"),
    PORT: z.coerce.number().default(3000),
  })
  .parse(process.env);
