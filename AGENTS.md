# AGENTS.md — Pennywise Backend

This file is the source of truth for agents working on this repo. Match existing patterns. Prefer the hybrid “prefer X over Y” list for new code; do not rewrite unrelated files.

---

## Stack (frozen unless we ask)

- Node.js ESM (`"type": "module"`)
- Express 5
- `pg` Pool (no ORM)
- Zod for request body validation
- JWT + bcrypt
- `node-pg-migrate`
- UUID v7 for primary keys

**Do not add:** ORM, TypeScript, class-based services, DI containers, or extra frameworks without an explicit request.

---

## Architecture (required)

### Request flow

```
HTTP
  → src/index.js
  → src/routes/v1.routes.js
  → src/api/{domain}/{domain}.routes.js
  → auth + Zod middleware
  → {domain}.controller.js
  → {domain}.service.js
  → {domain}.repo.js
  → PostgreSQL

Controllers use handleResponse for success and next(error) for failures.
Errors end at globalErrorHandler.
```

### Project layout

```
src/
├── index.js
├── config/db.js
├── routes/v1.routes.js
├── middlewares/
├── utils/
└── api/{domain}/
    ├── {domain}.routes.js
    ├── {domain}.controller.js
    ├── {domain}.service.js
    ├── {domain}.repo.js
    └── {domain}.validator.js
migrations/
```

### Folder contract under `src/api/{domain}/`

| File | Role |
|------|------|
| `{domain}.routes.js` | Wire HTTP only |
| `{domain}.controller.js` | Parse HTTP, call service, `handleResponse` / `next(error)` |
| `{domain}.service.js` | Business rules, ownership, transactions |
| `{domain}.repo.js` | Parameterized SQL only |
| `{domain}.validator.js` | Zod body schemas |

Shared code lives in `src/middlewares/`, `src/utils/`, `src/config/db.js`, and `src/routes/v1.routes.js`. Schema changes live in `migrations/`.

### Adding a domain

1. Create the five files under `src/api/{domain}/`.
2. Mount the router in `src/routes/v1.routes.js`.
3. Protect with `authenticationMiddleware` unless the domain is public (`auth`, `health`).

### Route verbs (existing convention)

- `GET /` — list
- `GET /:id` — by id
- `POST /create` — create
- `PATCH /:id/update` — update
- `DELETE /:id/delete` — delete

Static paths (e.g. `/fill-budgets`) must stay **above** `/:id` routes.

---

## Clean Architecture (mapped to this repo)

Do not invent hexagonal folders or ports/adapters. Map to what we already have:

| Clean Architecture idea | This repo |
|-------------------------|-----------|
| Interface adapters (HTTP) | Routes + controllers |
| Use cases | Services |
| Persistence | Repos |
| Inbound input shape | Zod validators |
| Shared helpers | Utils (not orchestration) |

### Layer rules (strict for new code)

- Controllers do not run SQL or contain business rules.
- Services do not send HTTP (`res`) or import Express.
- Repos do not enforce auth policy; they return data (including empty/not found).
- Utils do not orchestrate multi-step writes. Avoid new util → repo imports (`balance.utils.js` is legacy).
- Prefer service → other **repo** over service → other **service**, except when reusing an already-exported workflow (e.g. account delete → transaction delete).

---

## DRY and SOLID (practical)

- **DRY:** Extract only after the same logic appears in 2+ places. Do not create helpers “just in case”.
- **SRP:** One domain folder; one concern per layer file.
- **OCP:** Add a new domain folder rather than bloating an unrelated service.
- **LSP / ISP:** No class hierarchies. Use named function exports.
- **DIP:** Depend on existing helpers (`withTransaction`, `throwErrorWithMessage`, `authorizeUserAction`). Do not invent interfaces or abstract repos.

---

## Simplicity constraints

- Prefer a function over a new class, folder, or “pattern”.
- No premature abstraction. No unused generic wrappers.
- Delete dead code. Do not comment it out.
- **No comments.** Names of files, functions, and variables must be self-explanatory. If a name needs a comment, rename it.

---

## Node.js best practices

- Keep ESM. Import with `.js` extensions. Prefer named exports.
- Use `async/await`. Never swallow errors.
- Secrets and config come from env only (`src/config/db.js` loads dotenv). Never hardcode credentials.

---

## Express best practices

- Controllers: `try/catch` + `next(error)`.
- Mutations: Zod schema + `validateBodyRequest` middleware.
- Success via `handleResponse`:

```js
{ status, message, data, pagination }
```

- Operational errors via `throwErrorWithMessage(message, status)` → `globalErrorHandler`:

```js
{ status, error }
```

- Do **not** invent a fourth response shape. Auth middleware’s `{ error }` is legacy; new middleware should prefer `next(error)` when practical.
- Keep controllers thin: parse input, call service, respond.

### Golden path (controller)

```js
export const getAllAccountsController = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor;
    const allAccounts = await accountsService.getAllAccounts(req.user, limit, cursor);
    handleResponse(res, 200, "Fetched accounts successfully", allAccounts.data, allAccounts.pagination);
  } catch (error) {
    next(error);
  }
};
```

---

## PostgreSQL best practices

- Raw SQL with `$1, $2, …` placeholders only. Never concatenate user input into SQL.
- Repo signature: last argument `client = pool` so `withTransaction` can pass a client.
- Multi-write money, balance, or budget changes **must** use `withTransaction`.
- Money columns: `NUMERIC`. Round with `roundNumber` (2 decimals). Do not accumulate floats.
- Index foreign keys and common filters (`user_id`, `(created_at, id)` for cursor pagination).
- Assign UUID v7 primary keys in the service before insert.
- Prefer `up`/`down` migrations with FKs, indexes, and `updated_at` triggers consistent with existing migrations.

### Golden path (repo)

```js
export const findAccountById = async (accountId, userId, client = pool) => {
  const sqlQuery = `SELECT * FROM "accounts" WHERE "id" = $1 AND "user_id" = $2;`;
  const { rows } = await client.query(sqlQuery, [accountId, userId]);
  return rows[0];
};
```

---

## User isolation (tenancy)

- Every SELECT / UPDATE / DELETE that touches user data must be scoped by `user_id`.
- Call `authorizeUserAction` before mutating a resource owned by another user.
- Never trust client-supplied `user_id` for ownership; use the authenticated user and DB-owned rows.

---

## Money / finance rules

- Use `NUMERIC` in Postgres for money fields.
- Round amounts to 2 decimals with `roundNumber`.
- Apply balance and budget updates atomically inside `withTransaction`.
- Keep income / expense / fill logic consistent with existing utils and services; do not invent a parallel money model.

---

## Security

- Parameterized SQL only.
- Never log or return password hashes, JWT tokens, or secrets.
- `req.user` may include the password hash — do not spread `req.user` into API responses.
- No secrets in git (`.env` stays ignored).
- Production 5xx responses stay generic (already handled by `globalErrorHandler`).

---

## Migrations

- Create with `npm run migrate:create`.
- Always implement `up` and `down`.
- Never edit an already-applied migration; add a new one instead.
- Run via `npm run migrate` / `npm run migrate:down`.

---

## Logging

- No `console.log` on the happy path in services or repos.
- Log failures with useful context only.
- Never log tokens, passwords, or password hashes.

---

## Git

- Conventional, imperative commit messages (e.g. `add …`, `fix …`, `update …`).
- Never commit `.env` or credential files.
- Never push unless explicitly asked.

---

## Prefer X over Y (new code only)

| Prefer | Over |
|--------|------|
| `req.user` from auth middleware | Re-fetching the same user by email unless a fresh row is required |
| `next(error)` in new middleware | Ad-hoc `res.status().json(...)` |
| Plural domain file names (`transactions.*`) | Mixed singular names |
| Matching nearby patterns | Inventing a new structure |
| Focused change for the task | “Fixing” unrelated copy-paste or unused params |

---

## What not to do

- Do not add hexagonal / ports-adapters layout or a new `src/domain` tree.
- Do not introduce TypeScript, ORMs, or class-based services without an explicit ask.
- Do not over-engineer: no unused abstractions, no speculative helpers.
- Do not leave commented-out code or explanatory comments — rename instead.
