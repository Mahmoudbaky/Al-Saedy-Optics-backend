import { z } from "zod";

/**
 * Environment is loaded by the runtime (`node --env-file` / `tsx --env-file-if-exists`)
 * or by the hosting platform (Vercel). We only validate here – no dotenv side effects –
 * so that misconfiguration fails fast at boot with a readable message.
 */
const csv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  APP_NAME: z.string().default("Al-Saedy Optics"),

  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  CORS_ORIGINS: z.string().optional().transform(csv),
  MOBILE_APP_SCHEMES: z.string().default("alsaedyoptics://").transform(csv),

  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("Al-Saedy Optics <no-reply@localhost>"),

  UPLOADTHING_TOKEN: z.string().optional(),

  CURRENCY: z.string().default("IQD"),
  DELIVERY_FEE: z.coerce.number().int().min(0).default(5000),
  FREE_DELIVERY_THRESHOLD: z.coerce.number().int().min(0).default(100_000),

  CLINIC_OPEN_HOUR: z.coerce.number().int().min(0).max(23).default(10),
  CLINIC_CLOSE_HOUR: z.coerce.number().int().min(1).max(24).default(20),
  CLINIC_SLOT_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
  CLINIC_TIMEZONE: z.string().default("Asia/Baghdad"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    // Logger is not available yet – this is the one place console is acceptable.
    console.error(`❌ Invalid environment variables:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
