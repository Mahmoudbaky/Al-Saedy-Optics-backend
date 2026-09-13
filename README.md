# Al-Saedy Optics — Backend API

REST API powering the **Al-Saedy Optics** mobile app (Expo / React Native) and its admin panel.
Sells prescription frames, sunglasses, contact lenses and accessories; handles prescriptions,
lens add-ons, orders with lab tracking, and eye-exam bookings.

| Layer | Choice |
|---|---|
| Runtime | Node ≥ 20, TypeScript (ESM), Express 5 |
| Database | **Neon** (Lakebase Postgres) via `pg` + **Drizzle ORM** (`drizzle-kit` migrations) |
| Auth | **Better Auth** — email/password, email OTP, `admin`, `bearer`, `expo` plugins |
| Validation | Zod 4 (schemas double as OpenAPI docs) |
| Logging | Pino (structured JSON in prod, pretty in dev, request ids, redaction) |
| Uploads | UploadThing (product images, prescription photos, avatars) |
| Email | Nodemailer (logged to console when SMTP isn't configured) |
| Push | Expo Push API |
| Docs | Swagger UI at `/docs`, Better Auth reference at `/api/auth/reference` |

---

## Quick start

```bash
pnpm install
cp .env.example .env            # fill DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET
pnpm db:migrate                 # apply ./drizzle/*.sql (uses the unpooled Neon URL)
pnpm db:seed                    # catalogue that matches the mobile app's demo data
ADMIN_EMAIL=you@shop.com ADMIN_PASSWORD='StrongPass123!' pnpm admin:create
pnpm dev                        # http://localhost:3000/docs
```

Generate a secret: `openssl rand -base64 32`.

### Neon setup

1. Create a project → copy **both** connection strings from the dashboard:
   - pooled (`…-pooler…`) → `DATABASE_URL` (used by the app)
   - direct → `DATABASE_URL_UNPOOLED` (used by `drizzle-kit` / `pnpm db:migrate`)
2. Use a Neon **branch** per environment (dev / preview / prod).

### Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | tsx watch mode |
| `pnpm build` / `pnpm start` | compile to `dist/` and run |
| `pnpm typecheck` / `pnpm test` | tsc / vitest |
| `pnpm db:generate` | create a new migration from schema changes |
| `pnpm db:migrate` | apply migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | idempotent seed |
| `pnpm auth:generate` | regenerate `src/db/schema/auth.ts` after changing Better Auth plugins |
| `pnpm admin:create` | create / promote an admin user |

---

## Project structure

```
src/
├── app.ts                  Express app factory (middleware order matters – see comments)
├── server.ts               Boot + graceful shutdown (skips listen() on Vercel)
├── config/                 env (validated with Zod), logger, uploadthing routes
├── db/
│   ├── index.ts            pg Pool + drizzle instance
│   ├── migrate.ts          migration runner
│   └── schema/             one file per domain: auth, catalog, customer, commerce, clinic, content
├── lib/                    framework-agnostic helpers
│   ├── auth.ts             Better Auth instance
│   ├── router.ts           createModuleRouter → typed route = guard + validation + OpenAPI
│   ├── openapi.ts          builds the OpenAPI doc from registered routes
│   ├── errors.ts           AppError hierarchy (NotFound, Conflict, …)
│   ├── http.ts             response envelope helpers (reply / created / noContent)
│   ├── i18n.ts             {ar,en} ⇄ *_ar/*_en column helpers
│   └── pagination.ts, schemas.ts, slug.ts, time.ts, pg-errors.ts
├── middleware/             attachSession / requireAuth / requireAdmin, validate, error handler,
│                           request logger (pino-http), rate limits
├── modules/<feature>/      feature modules, each with:
│   ├── *.schema.ts         Zod input + response schemas (also feed the docs)
│   ├── *.repository.ts     Drizzle queries only – no business rules
│   ├── *.service.ts        business rules, transactions, DTO mapping
│   └── *.routes.ts         customer routes + admin routes
├── services/               cross-cutting: email, push
└── scripts/                seed, create-admin
```

Request flow: `routes → (auth guard) → validate → service → repository → Drizzle`.
Services throw `AppError`s; the error middleware turns them (and Zod / Postgres errors)
into the JSON envelope.

### Conventions

- **Response envelope** — `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.
- **Bilingual fields** — stored as `name_ar` / `name_en`, returned as `{ "ar": "…", "en": "…" }` (matches the app's `LocalizedString`).
- **Money** — whole IQD integers. No floats anywhere.
- **Ids** — UUIDs. Product detail also accepts the slug (`/products/vc-214`) for deep links.
- **Pagination** — `?page=&limit=`, result in `meta`.
- **Versioning** — everything under `/api/v1`; auth under `/api/auth`.

---

## API map

| Area | Public | Signed-in customer (`/me`) | Admin (`/admin`) |
|---|---|---|---|
| Home | `GET /home` (bundle) | | `GET /dashboard/overview`, `/revenue`, `/top-products` |
| Catalogue | `GET /categories`, `/brands`, `/lens-addons`, `/banners`, `/products`, `/products/:idOrSlug`, `/products/:id/reviews` | `PUT /products/:id/reviews/mine` | full CRUD on categories, brands, lens-addons, banners, products (+ variants, images, stock, bulk), reviews moderation |
| Account | | `GET/PATCH /me`, addresses, devices (push tokens), notifications | users list / role / ban |
| Prescriptions | | CRUD `/me/prescriptions` | list pending, `POST /prescriptions/:id/review` |
| Cart | | `/me/cart` items / promo / prescription | promo codes CRUD |
| Orders | | `POST /me/orders/checkout`, list, detail, cancel | list, detail, `POST /:id/status`, courier / ETA / payment |
| Clinic | `GET /clinic/doctors`, `/clinic/availability` | book / reschedule / cancel `/me/appointments` | schedule, status, doctors CRUD |

Open `/docs` for every endpoint with request/response schemas.

### Order lifecycle

```
pending ──► confirmed ──► lab ──► onTheWay ──► delivered      (home delivery)
                     └──► lab ──► ready    ──► delivered      (pickup)
any active state ──► cancelled   (customer: only while pending/confirmed)
```

Cash-on-delivery orders start at `confirmed`; card / wallet start at `pending` until staff
confirm payment (no PSP integration yet). Cancelling releases stock and promo usage.
Every transition writes an `order_events` row (the tracking timeline) and a push/in-app notification.

### Checkout rules

- Totals are recomputed server-side from live prices; the client never sends amounts.
- Items with `requiresPrescription` need a **verified** prescription attached (cart or body).
- Home delivery needs an address (defaults to the customer's default address). Fee = `DELIVERY_FEE`, free above `FREE_DELIVERY_THRESHOLD`; pickup is free.
- Stock is decremented per colour variant inside the transaction.

---

## Authentication (Better Auth)

All auth endpoints live under `/api/auth/*` — see `/api/auth/reference`.

| Flow | Endpoint |
|---|---|
| Sign up | `POST /api/auth/sign-up/email` `{ email, password, name, phone?, locale? }` |
| Sign in | `POST /api/auth/sign-in/email` |
| Passwordless | `POST /api/auth/email-otp/send-verification-otp` `{ email, type: "sign-in" }` → `POST /api/auth/sign-in/email-otp` |
| Verify email | `…/send-verification-otp` `{ type: "email-verification" }` → `POST /api/auth/email-otp/verify-email` |
| Forgot password | `POST /api/auth/email-otp/request-password-reset` → `POST /api/auth/email-otp/reset-password` |
| Session | `GET /api/auth/get-session`, `POST /api/auth/sign-out` |
| Update / delete | `POST /api/auth/update-user`, `POST /api/auth/delete-user` |

Mobile clients receive the session token in the `set-auth-token` response header and send
`Authorization: Bearer <token>` (the `bearer` plugin). Browsers (admin panel) use cookies —
add the panel's origin to `CORS_ORIGINS`.

Roles: `user` (default) and `admin`. `requireAdmin` checks `user.role === "admin"`.
Promote with `pnpm admin:create` or `POST /api/v1/admin/users/:id/role`.

### Wiring the Expo app

```bash
npx expo install @better-auth/expo expo-secure-store
```

```ts
// src/lib/auth-client.ts (in the Expo project)
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL, // e.g. https://api.alsaedyoptics.com
  plugins: [expoClient({ scheme: "alsaedyoptics", storage: SecureStore }), emailOTPClient()],
});

// Every other API call:
const cookies = authClient.getCookie();
fetch(`${API}/api/v1/me/cart`, { headers: { Cookie: cookies } });
```

The app's `scheme` in `app.json` must be listed in `MOBILE_APP_SCHEMES` so deep links pass the
origin check. `exp://` dev origins are whitelisted automatically when `NODE_ENV=development`.

---

## Logging & observability

- Every request gets an `x-request-id` (honoured if the client/proxy sends one) that is
  echoed in the response and attached to every log line via `req.log`.
- Log level: `LOG_LEVEL` (default `debug` in dev, `info` in prod, `trace` also logs SQL).
- Secrets, tokens, OTPs and cookies are redacted.
- `GET /health` (liveness) and `GET /health/ready` (checks the database) for uptime monitors.

## Deployment (Vercel)

1. Set the env vars from `.env.example` in the project settings (`NODE_ENV=production`).
2. Run `pnpm db:migrate` against the production branch before/with each deploy
   (e.g. as a CI step using `DATABASE_URL_UNPOOLED`).
3. `vercel.json` routes everything to `src/server.ts`; the app is exported as the handler.

## Adding a feature

1. Add tables in `src/db/schema/*.ts` → `pnpm db:generate` → `pnpm db:migrate`.
2. Create `src/modules/<feature>/` with schema / repository / service / routes.
3. Register the router in `src/modules/index.ts` — the docs update themselves.
