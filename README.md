# BackendAssessment — Core API

The domain tier of the Zurich customer portal assessment: a **Nest.JS microservice**
holding every business rule, fronted by a **Nest.JS API gateway** that speaks HTTP.

This repository is one of three:

| Repository            | Role                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `FrontendAssessment`  | Next.JS portal — Google OAuth2, Redux, rendering only              |
| `BFFAssessment`       | Nest.JS backend-for-frontend — verifies the user, audits, shapes   |
| **`BackendAssessment`** | **Core API gateway + users microservice — all business logic**  |

```
Browser ──► Next.JS (session cookie) ──► BFF ──► API gateway ──TCP──► users microservice
                                                                              │
                                                                   filter · mask · paginate
```

## Why two processes

The assignment requires business logic to be unreachable from the browser. Splitting
the tier makes that structural rather than a matter of discipline:

- **`users-service`** owns the rules — the "first name starts with G **or** last name
  starts with W" filter, email masking, pagination, and traversal of the paginated
  upstream. It has **no HTTP listener at all**. It binds a TCP transport to `127.0.0.1`,
  so nothing outside the host can reach it even if a firewall rule is wrong.
- **`api-gateway`** owns the edge — authentication, validation, rate limiting, and error
  shaping. It holds no rules worth stealing; it forwards a message and returns a result.

## Endpoints

All `/users` routes require `Authorization: Bearer <jwt>`.

| Method | Route              | Purpose                                                    |
| ------ | ------------------ | ---------------------------------------------------------- |
| `GET`  | `/health`          | Liveness. Unauthenticated.                                  |
| `POST` | `/auth/token`      | Server-to-server token exchange. Requires `x-api-key`.       |
| `GET`  | `/users`           | Filtered, paginated users with **masked** emails.            |
| `GET`  | `/users/:id`       | One user, masked.                                           |
| `GET`  | `/users/:id/email` | Releases **one** full address, on explicit request.          |

`GET /users` accepts `page`, `perPage` (capped at 100) and `filtered`. Any other query
parameter is rejected with a 400 rather than ignored.

### Email masking

Addresses are never returned in the list payload. `list` emits `maskedEmail`
(`ge**********@reqres.in`) and the raw address exists only in the microservice memory.
Revealing one costs a deliberate, logged, per-user request — so the complete set of
addresses is never sitting in a response waiting to be scraped.

### The filtered set is the whole world

`GET /users/:id` and `/users/:id/email` return **404 for a user outside the filter**,
not 403. A caller cannot walk ids to learn who else exists in the upstream directory.

## Data source

`reqres.in` now requires a per-account `x-api-key`, so a reviewer without a key cannot
run against it. The source is therefore an injected interface with two implementations:

- `USERS_SOURCE=local` *(default)* — serves the reqres dataset from memory. Identical
  ids, names, emails and avatars. Runs offline, and keeps unit tests off the network.
- `USERS_SOURCE=reqres` — calls the live API. Requires `REQRES_API_KEY`
  (free from <https://app.reqres.in/api-keys>).

The HTTP source **traverses every page**: it reads page 1, learns `total_pages` from the
envelope, requests the remainder concurrently, and flattens. The page count is never
hard-coded, and `REQRES_MAX_PAGES` stops a misreported `total_pages` from turning one
inbound request into thousands of outbound ones.

## Running it

```bash
npm install
cp .env.example .env      # then fill in the two secrets
npm run start:dev         # runs both processes with watch mode
```

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Try it:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/token \
  -H 'content-type: application/json' \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{"email":"you@example.com"}' | jq -r .accessToken)

curl -s http://localhost:4000/users -H "Authorization: Bearer $TOKEN" | jq
```

## Security posture

| Concern                | How it is handled                                                        |
| ---------------------- | ------------------------------------------------------------------------ |
| Business logic leakage | Rules live in a process with no HTTP listener, bound to loopback.         |
| Unauthenticated access | Every `/users` route sits behind a Passport JWT guard.                    |
| Service impersonation  | `/auth/token` compares the service key in **constant time** over a hash.  |
| Token replay           | JWTs are short-lived (15 min default) and carry issuer + audience claims. |
| Parameter tampering    | `ValidationPipe` with `whitelist` **and** `forbidNonWhitelisted`.         |
| Enumeration            | Users outside the filtered set 404 rather than 403.                       |
| Error leakage          | An unclassified failure returns a bare 500; stacks stay in the logs.      |
| Abuse                  | `ThrottlerGuard`, 120 requests per minute per IP.                        |
| Header hardening       | `helmet` on the gateway.                                                 |
| CORS                   | Closed by default — the gateway is called server-side, never from a tab.  |
| Boot-time safety       | A missing `JWT_SECRET` or `SERVICE_API_KEY` fails startup, not a request. |

## Tests

```bash
npm test           # 64 unit tests
npm run test:cov   # with coverage
```

Covered: the G/W filter (including case, whitespace, and non-leading letters), masking
across every edge case, pagination clamping and caps, enumeration refusal, upstream page
traversal and its ceiling, the constant-time key check, token claims and expiry, and the
error-shape contract in **both** directions across the RPC boundary.

## Layout

```
apps/
  api-gateway/          HTTP edge — auth, validation, throttling, error shaping
    src/auth/           token issuance, JWT strategy, guard
    src/users/          controller + proxy to the microservice
    src/common/filters/ restores RPC-serialised statuses at the edge
  users-service/        the domain — no HTTP listener
    src/users/          filter, masking, pagination
    src/users/sources/  swappable upstream (local | reqres)
libs/contracts/         message patterns and DTOs shared by both sides of the wire
```
