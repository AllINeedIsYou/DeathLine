# DeathLine frontend

React, TypeScript, and Vite. The interface is connected to FastAPI for registration, sign-in, email verification, password recovery, teams, invitations, tasks, profiles, private notes, statistics, GOAT, and charts.

## Local development

Start the API from `backend`:

```sh
../.venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from `frontend` (Node.js 22+):

```sh
npm install
npm run dev
```

Alternatively, run `pnpm install --frozen-lockfile` and `pnpm dev`. Dependencies are pinned in `pnpm-lock.yaml`.

Open **http://127.0.0.1:5173**. Vite forwards `/api/*` to `http://127.0.0.1:8000/*`. The session cookie remains HttpOnly; the frontend does not read or store the session token. Normal use does not require Swagger.

Set `FRONTEND_URL=http://127.0.0.1:5173` in `backend/.env` so verification, recovery, and invitation links open the correct frontend.

To use a different API server, create `frontend/.env.local`:

```dotenv
DEATHLINE_API_TARGET=http://127.0.0.1:8000
```

`VITE_API_URL` is only needed when the browser should call a separate API origin directly. The default is `/api`. A separate origin requires matching backend CORS and cookie settings. `VITE_*` values are public; never put credentials in them.

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Sign-in; authenticated users continue to their workspace |
| `/register/` | Registration, verification, existing teams, and team creation |
| `/verify-email?token=...` | Verify an email address |
| `/forgot-password/` | Request a recovery link |
| `/reset-password?token=...` | Set a new password |
| `/invite/<token>` | Preview and accept an invitation with a new or existing account |
| `/admin/?team=<id>` | Admin workspace |
| `/employee/?team=<id>` | Employee workspace |

Legacy `-preview` paths use the same real session and role checks. The top-bar menu switches between your teams. Opening another workspace URL does not grant access to its data.

## Behavior

- All business data is loaded and saved through the API. There are no demo users, tasks, or scores.
- A successful save is shown only after a server response. Errors leave the form and draft intact.
- Lists refresh after mutations, when the window regains focus, and every 30 seconds while visible.
- Administrators and employees retain distinct team roles. A job title is separate from access permissions.
- Administrators can update a member's job title; users edit their own names, contacts, and time zone.
- Private notes are fetched for a specific membership and author. Clearing a note sends DELETE.
- Invitation links are emailed automatically and are also available for copying after creation. Pending invitations have a Resend email action, available once a minute; it replaces the previous link. If email delivery fails, the interface reports it and keeps the copyable link available.
- GOAT comes from the server, using the deadline month in the team's time zone. A score of `0` is displayed as a result; `null` means insufficient data.
- Charts use recorded server events. Missing historical data appears as gaps, not zeroes.
- Local storage is only used for the visual glitch preference.
- The interface, API messages, and emails are in English. User-entered names and content are preserved.

## Build

```sh
npm run build
npm run preview
```

The build is written to `frontend/dist/`. A production static server must return `index.html` for application routes and reverse-proxy `/api/` to FastAPI with that prefix removed. Hosting also requires HTTPS and production cookie/CORS configuration. Building the frontend does not deploy a server.

## Integration checks

The checks run real FastAPI routes against a separate temporary database and capture outgoing emails. They do not populate or clear application data or contact the real SMTP server.

Install Playwright for testing (`npm install --no-save --package-lock=false playwright`, then `npx playwright install chromium`). From the repository root:

```sh
bash frontend/tests/run-integration.sh
```

The default database is temporary SQLite. To test PostgreSQL:

```sh
DEATHLINE_TEST_POSTGRES=1 bash frontend/tests/run-integration.sh
DEATHLINE_TEST_POSTGRES=1 .venv/bin/python frontend/tests/invitation_email_checks.py
```

This creates a dedicated `deathline_e2e_<random suffix>` database using the local connection configuration and removes only that database afterward. The PostgreSQL role needs permission to create databases. Test servers use ports 18000 and 15173 and shut down automatically.

Coverage includes registration and verification emails, invitations, task creation/editing/completion, job titles, private notes, profiles, rankings, history, multiple memberships, administrator-owned tasks, invitation revocation, sign-out, password recovery, expired sessions, connection failures, and retrying a failed save.

See the [API contract](docs/API_CONTRACT.md) for routes and fields, or Swagger on the running backend for complete schemas.
