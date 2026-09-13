import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins/email-otp";
import { openAPI } from "better-auth/plugins";
import { env, isDev, isProd } from "../config/env.js";
import { createLogger } from "../config/logger.js";
import { db } from "../db/index.js";
import { account, rateLimit, session, user, verification } from "../db/schema/index.js";
import { emailService } from "../services/email.service.js";

const log = createLogger("auth");

/**
 * Better Auth server instance.
 *
 * Sign-in methods
 *  - email + password (mobile app & admin panel)
 *  - email OTP (passwordless sign-in, email verification, password reset)
 *
 * Plugins
 *  - admin:  `role` on user, ban / unban, list users, impersonation
 *  - bearer: lets the mobile app send `Authorization: Bearer <token>`
 *  - expo:   deep-link aware origin checks + cookie handling for React Native
 *  - openAPI: `/api/auth/reference` documentation
 */
export const auth = betterAuth({
  appName: env.APP_NAME,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),

  trustedOrigins: [
    ...env.CORS_ORIGINS,
    ...env.MOBILE_APP_SCHEMES,
    // Expo Go dev client origins – never enable in production.
    ...(isDev ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "exp://10.*.*.*:*/**"] : []),
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },

  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: true },
      locale: { type: "string", required: false, defaultValue: "ar", input: true },
    },
    changeEmail: { enabled: true },
    deleteUser: { enabled: true },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days – mobile users stay signed in
    updateAge: 60 * 60 * 24, // refresh expiry once a day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  rateLimit: {
    enabled: isProd,
    window: 60,
    max: 60,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-in/email-otp": { window: 60, max: 10 },
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    database: { generateId: "uuid" },
  },

  logger: {
    level: isDev ? "debug" : "warn",
    log: (level, message, ...args) => {
      // Better Auth's LogLevel type omits "success" but emits it at runtime.
      const fn = (level as string) === "success" ? "info" : level;
      log[fn]({ args: args.length ? args : undefined }, message);
    },
  },

  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await emailService.sendOtp(email, otp, type);
      },
    }),
    expo(),
    openAPI({ disableDefaultReference: false }),
  ],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
export type SessionUser = Session["user"];
