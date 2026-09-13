# Al-Saedy Optics backend

Express 5 + TypeScript (ESM, NodeNext) · Drizzle ORM on Neon Postgres (`pg` driver) · Better Auth 1.7 · Zod 4 · Pino.

## Commands
- `pnpm dev` / `pnpm typecheck` / `pnpm test` / `pnpm build`
- `pnpm db:generate` (after schema edits) → `pnpm db:migrate`; `pnpm db:seed`; `pnpm admin:create`
- `pnpm auth:generate` after changing Better Auth plugins, then diff `src/db/schema/auth.ts`

## Architecture rules
- Feature modules in `src/modules/<name>/`: `*.schema.ts` (Zod in+out) → `*.routes.ts` → `*.service.ts` → `*.repository.ts`.
  Repositories only query; services own business rules/transactions and map rows to DTOs.
- Define routes with `createModuleRouter(...).route({...})` (src/lib/router.ts) — it wires auth guard,
  validation and OpenAPI from one definition. Return plain data or `reply()/created()/noContent()`.
- Throw `AppError` subclasses (src/lib/errors.ts); never `res.status().json()` errors by hand.
- Bilingual text = `<field>Ar`/`<field>En` columns, exposed as `{ ar, en }` via `localized()` / `toColumns()`.
- Prices are integer IQD. Ids are UUIDs (Better Auth users included).
- Better Auth handler is mounted before `express.json()` — keep it that way.
- Log with `createLogger("module")` or `req.log`; never `console.*`.
- Public routes: `/api/v1/...`; customer: `/api/v1/me/...`; admin: `/api/v1/admin/...`; auth: `/api/auth/...`.
