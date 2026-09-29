# API Docs — Database & Search Module (m5 / Balaji)

Base URL (local dev): `http://localhost:4000`

## Auth

Most routes will eventually require a Supabase JWT in the `Authorization`
header once other members wire up `/api/auth`. `/api/search` works without
one (RLS still applies — an anonymous caller just sees public data only).

**To get a test token** for any of the 6 seeded users (see `src/db/seed.js`),
call Supabase's own auth endpoint directly:

```bash
curl -X POST "https://YOUR-PROJECT-REF.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@clubplatform.test","password":"TestPass123!"}'
```

The response's `access_token` is the Bearer token. Use it as:
```
Authorization: Bearer <access_token>
```

## GET /health

Health check, no auth needed.

**Response 200:**
```json
{ "status": "ok" }
```

## GET /api/search

Search across posts, debates, users, and tags. Posts and debates use ranked
full-text search (`tsvector` + `ts_rank`); users and tags use `ILIKE`.

RLS applies automatically based on the caller's token (or lack of one) — a
logged-in user's own draft posts are included in their own search results,
but nobody else's drafts are.

### Query parameters

| Param   | Required | Description                                                        |
| ------- | -------- | -------------------------------------------------------------------- |
| `q`     | yes      | Search text, max 100 chars. Supports `"phrase"`, `-exclude`, `OR` for posts/debates (via `websearch_to_tsquery`). |
| `type`  | no       | One of `posts`, `debates`, `users`, `tags`. Omit to search all four.  |
| `page`  | no       | Default `1`.                                                         |
| `limit` | no       | Default `10`, max `50`.                                              |

### Examples

**All types:**
```
GET /api/search?q=postgres
```
```json
{
  "query": "postgres",
  "results": { "posts": [...], "debates": [...], "users": [...], "tags": [...] },
  "counts": { "posts": 1, "debates": 0, "users": 0, "tags": 0 }
}
```

**One type, paginated:**
```
GET /api/search?q=react&type=posts&page=1&limit=5
```
```json
{
  "query": "react",
  "type": "posts",
  "page": 1,
  "limit": 5,
  "total": 1,
  "results": [ { "id": "...", "title": "...", "rank": 0.24, ... } ]
}
```

**Phrase / exclusion syntax (posts and debates only):**
```
GET /api/search?q="full-text search"&type=posts
GET /api/search?q=transformers -beginners&type=posts
```

### Errors

| Status | When                                      |
| ------ | ----------------------------------------- |
| 400    | Missing `q`, `q` over 100 chars, or invalid `type` |
| 500    | Unexpected server/DB error                |

## Other routes (stubs — not yet implemented)

See `src/routes/*.routes.js` for the full ownership map (also in the main
README). Each currently returns:
```json
{ "message": "/api/<path> route stub — not implemented yet", "owner": "..." }
```

## Notes for integration (Dishari / m4)

- CORS is currently wide open (`cors()` with no options) for local dev —
  **restrict this to the actual frontend origin before deploying.**
- `SUPABASE_SERVICE_ROLE_KEY` must never reach the frontend or a public
  repo — it's server-only, used for admin actions and seeding.
- `notifications` has no public INSERT policy by design (see README) —
  any route that should trigger a notification needs to use `supabaseAdmin`
  server-side to insert it.
