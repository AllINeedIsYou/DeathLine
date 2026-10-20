# DeathLine integrated API contract

The frontend calls `/api`; Vite removes the prefix and forwards requests to FastAPI on `127.0.0.1:8000`. Every request uses `credentials: include`. The server session is stored in the HttpOnly `deathline_session` cookie. No authentication token is returned to frontend JavaScript.

## Identifiers and timestamps

- `Users.id` identifies an account. Tasks use `user_id` for the assignee.
- `TeamMembers.id` identifies an account's membership in a specific team. Profiles, notes, member statistics, and member history use it in `members/{employee_member_id}`.
- `GET /teams` returns the current account's teams with `id`, `name`, `timezone`, `role`, and `created_at`. Roles belong to memberships and remain separate from job titles.
- Timestamps use ISO 8601 with a time zone. The deadline form converts its value to UTC using `toISOString()`.
- An empty task PATCH does not update the task. The frontend only sends changed fields, allowing an overdue task title to change without resubmitting its unchanged deadline.
- `null` and `0` differ: a zero score is a real result; missing history is not the same as no tasks.

## Authentication

| Method | Path | Request / result |
| --- | --- | --- |
| POST | `/auth/register` | `name`, `username`, `email`, `password`, `timezone`, optional `phone`, `telegram`; 201, profile plus `verification_email_sent` |
| POST | `/auth/login` | `username`, `password`; profile and session cookie |
| GET | `/auth/me` | Current profile; 401 without a valid session |
| PATCH | `/auth/me` | Own name, phone, Telegram, and time zone; updated profile |
| POST | `/auth/logout` | 204, session and cookie removed |
| POST | `/auth/verify-email` | `token`; verified profile |
| POST | `/auth/resend-verification` | Authenticated user, 204 |
| POST | `/auth/forgot-password` | `email`; generic result that does not reveal whether an account exists |
| POST | `/auth/reset-password` | `token`, `new_password`; 204, all user sessions ended |

New passwords require 8–128 characters, at least one uppercase letter and one special character. Whitespace does not count as special. Sign-in does not revalidate existing passwords against the new policy. Registration does not create a session: the frontend signs in separately, then shows email verification.

## Teams and invitations

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/teams` | `name`, `timezone`; creator becomes admin, 201 |
| GET | `/teams` | Current account's teams and membership roles |
| GET | `/teams/{team_id}/members` | Members with nested `user`, role, and job title; admin |
| GET | `/teams/{team_id}/members/{employee_member_id}` | Member profile; admin |
| PATCH | `/teams/{team_id}/members/{employee_member_id}` | `job_title`, or `null` to clear it; admin |
| POST | `/teams/{team_id}/invitations` | `email`, `role`; 201, `{invitation, invite_url, email_sent}`; admin |
| GET | `/teams/{team_id}/invitations` | Invitations and statuses; admin |
| POST | `/teams/{team_id}/invitations/{invitation_id}/resend` | Replace a pending link and email the new invitation; admin |
| DELETE | `/teams/{team_id}/invitations/{invitation_id}` | Revoke an invitation, 204; admin |
| GET | `/invitations/{token}` | Public preview: `team_id`, `team_name`, `email`, `role`, `expires_at`, `status` |
| POST | `/invitations/{token}/accept` | 204; current account must have the matching verified email |

Statuses: `pending`, `accepted`, `expired`, `revoked`. Links last seven days. Creation automatically emails the invitation and returns `email_sent`. If SMTP fails, the invitation and copyable link remain valid and `email_sent=false`. Lists do not expose raw tokens. Resending revokes the old invitation and creates a new link in one transaction; the previous link stops working. Only pending invitations can be resent, no more than once a minute. Expired and revoked invitations must be replaced using a new invitation. After verifying their email, recipients return to the original invitation tab. The invitation determines the role; registration cannot grant an administrator role.

## Tasks

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/teams/{team_id}/tasks` | Assign a task to a member; admin, 201 |
| GET | `/teams/{team_id}/tasks` | All team tasks; admin |
| GET | `/teams/{team_id}/my-tasks` | Own tasks, including completed tasks |
| GET | `/teams/{team_id}/tasks/{task_id}` | One task; assignee or admin |
| PATCH | `/teams/{team_id}/tasks/{task_id}` | Edit an unfinished task; admin |
| POST | `/teams/{team_id}/tasks/{task_id}/complete` | Complete your own task; repeated calls preserve completion time |

Creation payload: `title`, nullable `description`, `user_id`, `priority` (`high`, `medium`, `low`), and `deadline`. Responses also include `id`, `team_id`, `created_at`, `updated_at`, and `completed_at`. PATCH cannot move a task between teams. A new deadline must be in the future; overdue tasks can still be completed. Administrators can complete tasks assigned to themselves.

## Private notes

Administrators only access their own notes about a member:

- GET `/teams/{team_id}/members/{employee_member_id}/private-note` returns the note with `text` and its timestamp, or `null`.
- PUT at the same path accepts `{text}` up to 4000 characters and returns the saved record. Empty strings are rejected.
- DELETE at the same path returns 204. Clearing the frontend form uses DELETE.

The session determines the author. Notes are excluded from shared profiles, general lists, and employee responses.

## Statistics and GOAT

GET `/teams/{team_id}/statistics` (admin), `/my-statistics` (own tasks), or `/members/{employee_member_id}/statistics` (admin).

Response: `total`, `active`, `completed`, `overdue`, `productivity_percent`, `on_time_percent`. These statistics cover all tasks, not just one month. Productivity is completed / (completed + unfinished overdue); punctuality is completed on time / completed. A zero denominator gives null.

- GET `/teams/{team_id}/goat/admin?year=2026&month=10` returns `team_id`, `year`, `month`, `timezone`, and the complete `members` ranking; admin.
- GET `/teams/{team_id}/goat?year=2026&month=10` returns the same period fields, `leaders`, and `my_result`; any member. It does not include the full ranking or the lowest-rated members.

A ranking entry contains `member_id`, `user_id`, `name`, `job_title`, `statistics`, `score`, and `rank`. At least five completed or overdue tasks are required. The score combines 60% productivity and 40% punctuality, rounded to one decimal place. A task belongs to its deadline month in the team's time zone; late completion updates that month's rating. Ties use ranks 1, 2, 2, 4. Insufficient data gives null for both `score` and `rank`. Zero scores stay visible.

## Task history

Both routes require admin access:

- GET `/teams/{team_id}/history?year=2026&month=10` — daily team chart.
- GET `/teams/{team_id}/members/{employee_member_id}/history?year=2026&month=10` — member chart.

Response: `team_id`, nullable `member_id` for team scope, `year`, `month`, `timezone`, `as_of`, `history_complete`, and `points`. A point contains `{at, created, completed, overdue}`.

Days follow the team's time zone. Finished days use their end-of-day state; today uses `as_of`. Future points are omitted. For team scope, `created` counts all tasks that existed at that point, including earlier months. For member scope it counts tasks assigned to that member at the point, so the frontend labels the series Assigned. Reassignment can reduce this number. `completed` and `overdue` describe state at the point, not events during that day.

Deadline and assignee changes do not rewrite earlier points. November completion does not add a completed task to October's chart. Missing older history gives null values and `history_complete=false`; the frontend draws gaps. Empty teams have zero counters. Events are saved in the same transaction as the task mutation.

GOAT and history require `year` from 2000 to 2100 and `month` from 1 to 12.

## Errors and refresh

401 ends the authenticated screen and opens sign-in. 403 means access denied. 404 means an object is unavailable in the current scope. 409 is a duplicate or state conflict. 422 reports invalid fields. 429 means an action is being requested too frequently. Forms display errors without simulating successful writes.

Lists refresh after mutations, when focus or tab visibility returns, after reconnection, and every 10 seconds while the tab is visible and online. Background refreshes preserve unsaved forms and skip resources that already have a request in progress. Ratings and historical charts are not reconstructed from current deadlines in the browser. This version does not require WebSocket.
