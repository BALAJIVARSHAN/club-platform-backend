# Club Platform — Backend

Express + Supabase (Postgres) backend for the Club Community & Blogging Platform.

## Stack

- **Runtime**: Node.js + Express
- **Database**: Supabase (Postgres) — see `src/db/migrations/001_init.sql`
- **Auth**: Supabase Auth (JWT forwarded from frontend, verified per-request)

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project's URL + keys
npm run dev             # starts on http://localhost:4000 with nodemon
```

Get your keys from Supabase dashboard → Project Settings → API.
`SUPABASE_SERVICE_ROLE_KEY` is only needed for `npm run seed` and any
future admin-only routes — never expose it to the frontend.

## Folder structure

```
src/
  server.js         entry point — loads .env, starts Express
  app.js            Express app: middleware, route mounting, error handler
  config/
    supabaseClient.js   supabaseAdmin (service role) + getClientForRequest (per-user, RLS-scoped)
  middleware/
    auth.middleware.js  attaches req.user from the Supabase JWT; requireAuth guards routes
    errorHandler.js
  routes/
    index.js        mounts every module's router under /api
    *.routes.js      one file per API area (see ownership map below)
  db/
    migrations/001_init.sql   the full schema migration (source of truth: club_platform_schema.dbml)
    seed.js          dummy data for local dev/testing (npm run seed)
```

## Route ownership map

Matches the team's original role split (see section 15 of the proposal doc).
Each `*.routes.js` file has an `Owner:` comment at the top — replace the stub
`router.get('/', ...)` handler with real logic in your own file only.

| Base path         | Owner                              |
| ------------------ | ----------------------------------- |
| `/api/auth`         | m1                                  |
| `/api/users`        | m1                                  |
| `/api/posts`        | m2                                  |
| `/api/comments`     | m2                                  |
| `/api/categories`   | m2                                  |
| `/api/tags`         | m2                                  |
| `/api/debates`      | m3                                  |
| `/api/search`       | m5 (Balaji)                         |
| `/api/admin`        | m5 (Balaji) — per resolved Dev6 role |
| `/api/reports`      | m5 (Balaji) — per resolved Dev6 role |
| `/api/notifications`| TBD — confirm with team             |
| `/api/games`        | FUTURE — Phase 5 dev                |
| `/api/streaks`      | FUTURE — Phase 5 dev                |
| `/api/leaderboard`  | FUTURE — Phase 5 dev (computed view, not a table) |

## Working with Supabase + RLS in routes

Every table has RLS enabled with a "public read, owner-only write,
admin/moderator override" pattern. Two clients are available in
`src/config/supabaseClient.js`:

- **`getClientForRequest(req)`** — forwards the logged-in user's JWT, so
  queries run AS that user and RLS applies automatically. Use this in
  almost every route (`req.supabase` is already attached by
  `auth.middleware.js`).
- **`supabaseAdmin`** — service role, bypasses RLS entirely. Only use for
  genuinely admin-only server logic or scripts, never for a regular
  user-facing route.

## Git workflow

- Protected `main` branch.
- Feature branches: `feature/auth`, `feature/blog`, `feature/debates`,
  `feature/search`, `feature/admin`, etc.
- Flow: Feature branch → Commit → Pull Request → Code Review → Merge.
- No unfinished work pushed directly to `main`.

## Running the migration / seed data

The migration (`src/db/migrations/001_init.sql`) should already be run in
the Supabase SQL Editor before anyone builds against this repo. To
populate local test data:

```bash
npm run seed
```

This creates 6 real test auth users (via the Supabase Admin API, so the
`handle_new_user` trigger fires correctly), plus sample posts, comments,
debates, reactions, and more. See `src/db/seed.js` for details and the
shared test password.
