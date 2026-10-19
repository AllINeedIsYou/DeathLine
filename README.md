![DeathLine — tasks, teams, time](docs/assets/readme-cover.svg)

<p align="center">
  <strong>Keep deadlines under control.</strong><br>
  A team workspace where every task has an owner, a deadline, and a result.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#project-status">Status</a> ·
  <a href="#local-setup">Setup</a> ·
  <a href="#api">API</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

## Meet DeathLine

<img align="right" src="frontend/public/brand/deathline-logo.png" alt="DeathLine logo" width="112">

DeathLine brings tasks, teammates, and deadlines into one workspace. Administrators assign work and monitor progress. Employees see their own tasks, focus on the next deadline, and mark their work as completed.

A dark interface, cyan accents, live timers, and optional glitch effects give the project its character. The goal is practical: **know what needs to be done, who owns it, and how much time is left**.

## Features

| For administrators | For employees |
| :--- | :--- |
| Create teams and invite members | Join a team using a personal invitation |
| Assign tasks, priorities, and deadlines | See assigned tasks and the next deadline |
| Edit tasks and reschedule deadlines | Complete assigned tasks |
| Review team workload, statistics, and history | See GOAT leaders and a personal rating |
| Manage job titles and private notes | Edit personal contact details and time zone |

**Accounts:** registration, sign-in, sign-out, email verification, and password recovery. A successful password reset invalidates existing sessions and consumes the reset token. New passwords require 8–128 characters, an uppercase letter, and a special character.

**Teams:** administrator and employee roles belong to memberships. An account can join multiple teams with different roles. Invitations are email-bound, expire after seven days, and can be revoked. The directory distinguishes team roles from job titles.

**Tasks:** each task has an assignee, priority, deadline, and creation/update/completion timestamps. An overdue task stays open until its assignee completes it. Task events preserve historical deadlines and assignments.

**GOAT:** monthly scores combine 60% productivity and 40% punctuality. Members need at least five completed or overdue tasks to qualify. The server uses the deadline month in the team's time zone; equal scores share a rank.

**Privacy:** administrators only see their own private notes. Employees receive their own tasks, the ranking leaders, and their personal result. Server-side membership and role checks enforce access.

## Project status

**The local application is connected end to end.** The interface uses real FastAPI data for accounts, teams, invitations, tasks, profiles, notes, statistics, ratings, and charts. Public deployment is a separate step.

| Area | Status |
| :--- | :--- |
| Admin and employee workspaces | Connected to the API |
| Registration, sessions, and email verification | Implemented and integrated |
| Email delivery and password recovery | Implemented; real email delivery previously verified |
| Team creation, switching, and invitations | Implemented and integrated |
| Task creation, editing, and completion | Implemented and integrated |
| Profiles, private notes, statistics, GOAT, and history | Implemented and integrated |
| Browser integration checks | Passed against an isolated PostgreSQL database |

## Stack

| Layer | Technologies |
| :--- | :--- |
| Interface | React 18 · TypeScript · Vite · CSS |
| API | Python 3.14 · FastAPI · Pydantic 2 |
| Data | PostgreSQL · SQLAlchemy · psycopg |
| Authentication | Server-side sessions · HttpOnly cookies · pwdlib / Argon2 |
| Email | SMTP over TLS · Gmail · single-use links |

## Local setup

You need **Python 3.14**, **Node.js 22+**, and **PostgreSQL**. Start in the repository root unless a command specifies otherwise.

### Backend

```sh
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install fastapi 'uvicorn[standard]' sqlalchemy 'psycopg[binary]' \
  'pwdlib[argon2]' 'pydantic[email]' pydantic-extra-types phonenumbers python-dotenv
```

Create your PostgreSQL database and copy [`backend/.env.example`](backend/.env.example) to `backend/.env`. Set your own connection URL and SMTP credentials:

```dotenv
DATABASE_URL=postgresql+psycopg://username:password@127.0.0.1:5432/deathline
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-project@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=DeathLine
FRONTEND_URL=http://127.0.0.1:5173
```

For Gmail, use an app password. The local `.env` is ignored by Git. `FRONTEND_URL` sets the destination of verification, password-reset, and invitation links. Connection credentials are loaded from the environment, not embedded in source code.

On macOS, a python.org installation may require `/Applications/Python 3.14/Install Certificates.command` to complete certificate setup. See the [Python installation guide](https://docs.python.org/3.14/using/mac.html#installation-steps).

Create missing tables without clearing existing data:

```sh
cd backend
python - <<'PY'
from DataBase.database import Base, engine
from DataBase import models
Base.metadata.create_all(bind=engine)
PY
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Changes to existing database columns require a migration; `create_all` only creates missing tables. Backend dependencies are currently listed in the installation command above rather than a dedicated requirements file.

### Frontend

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

Alternatively, use `pnpm install --frozen-lockfile` and `pnpm dev`. Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. Vite proxies `/api` to the backend on port 8000, keeping local browser requests on one origin. Verification and reset links open dedicated frontend pages.

`npm run build` produces `frontend/dist/`; `npm run preview` serves a local preview. Production hosting needs an SPA fallback for page routes, an API reverse proxy, HTTPS, and appropriate cookie/CORS settings.

## API

Interactive documentation: [Swagger](http://127.0.0.1:8000/docs) · [OpenAPI](http://127.0.0.1:8000/openapi.json).

| Method | Route | Purpose |
| :--- | :--- | :--- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Account registration and session management |
| GET, PATCH | `/auth/me` | Read and update your own profile |
| POST | `/auth/verify-email`, `/auth/resend-verification` | Verify an email address |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Recover account access |
| POST, GET | `/teams` | Create a team or list your teams |
| GET | `/teams/{team_id}/members` | List team members |
| GET, PATCH | `/teams/{team_id}/members/{member_id}` | Read a profile or update its job title |
| POST, GET | `/teams/{team_id}/tasks` | Create or list team tasks |
| GET, PATCH | `/teams/{team_id}/tasks/{task_id}` | Read or update a task |
| POST | `/teams/{team_id}/tasks/{task_id}/complete` | Complete your own task |
| GET | `/teams/{team_id}/my-tasks` | List your assigned tasks |
| POST, GET, DELETE | `/teams/{team_id}/invitations[/{invitation_id}]` | Create, list, or revoke invitations |
| GET, POST | `/invitations/{token}[/accept]` | Preview or accept an invitation |
| GET, PUT, DELETE | `/teams/{team_id}/members/{member_id}/private-note` | Manage your private note |
| GET | `/teams/{team_id}/statistics`, `/my-statistics` | Read task statistics |
| GET | `/teams/{team_id}/goat[/admin]` | Read monthly ranking results |
| GET | `/teams/{team_id}/history` | Read daily task history |

Full paths, payloads, access rules, and member-specific statistics/history routes are documented in the [API contract](frontend/docs/API_CONTRACT.md). Swagger reflects the running server's schemas.

## Verification

The browser checks cover registration, captured verification emails, invitations, task creation/editing/completion, job titles, private notes, profiles, rankings, charts, multiple memberships, sign-out, password recovery, expired sessions, and network failures.

Tests use an isolated temporary database and capture outgoing mail. They do not populate or clear application data. See the [frontend testing instructions](frontend/README.md#integration-checks).

## Roadmap

- [x] Accounts, email verification, sessions, and password recovery.
- [x] Teams, membership roles, invitations, and team switching.
- [x] Tasks, private notes, profiles, and contact details.
- [x] Server statistics, monthly GOAT, and historical charts.
- [x] Frontend/API integration and browser checks.
- [x] English interface, messages, emails, and documentation.
- [ ] Production configuration, deployment, and additional API hardening.
- [ ] Database migrations and a dedicated backend dependency manifest.

## Structure

```text
DeathLine/
├── backend/
│   ├── api/
│   │   ├── service/       # Account, team, task, invitation, and email logic
│   │   ├── auth.py        # Authentication and account recovery
│   │   ├── teams.py       # Team operations
│   │   ├── invitations.py # Invitation preview and acceptance
│   │   └── shemas.py      # Request and response schemas
│   ├── DataBase/          # Models and PostgreSQL connection
│   ├── config.py         # Settings loaded from .env
│   └── main.py           # FastAPI application
├── frontend/
│   ├── src/features/     # Account flows, workspaces, and tasks
│   ├── src/shared/       # API client, session, profile, and team menu
│   ├── tests/            # Isolated browser integration checks
│   └── public/brand/     # Logo and illustrations
└── docs/assets/          # README artwork
```

More details: [frontend](frontend/README.md) · [backend milestones](frontend/docs/BACKEND_NEXT_STEPS.md) · [API contract](frontend/docs/API_CONTRACT.md).
