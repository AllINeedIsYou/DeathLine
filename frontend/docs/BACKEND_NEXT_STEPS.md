# Backend milestones

Updated October 20, 2026. The core backend blocks are implemented and connected to the frontend. This document records their responsibilities and the remaining work. See [the frontend README](../README.md) for setup and [the API contract](API_CONTRACT.md) for current routes.

## 1. Accounts and sessions — complete

Users have an ID, display name, unique username and email, password hash, optional phone and Telegram, time zone, creation timestamp, and email verification timestamp.

Passwords are hashed with pwdlib/Argon2. Session tokens are random; the database stores their SHA-256 hashes. The browser receives an HttpOnly cookie. Current-user dependencies resolve the session and enforce authentication.

Registration, sign-in, sign-out, email verification, resending verification, password recovery, and profile editing are implemented. Verification and recovery tokens are single-use and time-limited. Reissuing a token revokes older active tokens. Password reset also removes existing sessions.

The shared password validator applies to registration and recovery: 8–128 characters, at least one uppercase letter and one special character. Whitespace is not special. Existing passwords remain usable at sign-in. A separate authenticated password-change endpoint is not implemented; email-based recovery is available.

## 2. Teams and memberships — complete

Teams have their own calendar time zone. Creating a team adds its creator as an administrator. The unique `(team_id, user_id)` membership identifies an account's role and optional job title in that team.

An account ID and a membership ID are different identifiers. Task assignment uses the account ID; member profile, private-note, statistics, and history routes use the membership ID. The interface shows administrator and employee roles explicitly, separately from job titles.

## 3. Tasks — complete

Each task belongs to one team and one assignee who must belong to that team. Tasks have a title, optional description, priority, aware deadline, and creation/update/completion timestamps.

Administrators create and edit tasks. Assignees complete their own tasks, including overdue ones. Repeated completion preserves the original completion time. Completed tasks cannot be edited through the normal task editor.

PATCH changes only supplied fields. Empty PATCH requests preserve `updated_at`. An unchanged overdue deadline does not prevent title or assignee changes. New deadlines must be in the future and include a time zone.

## 4. Invitations — complete

Administrators invite a specific email as an employee or administrator. Seven-day invitation links contain random tokens; only hashes are stored. Recipients need an authenticated account with the matching verified email. Acceptance creates membership and consumes the invitation atomically.

Administrators can inspect statuses and revoke invitations. Expired or revoked links do not become valid again. Duplicate active invitations and invitations for existing members are rejected. Links are emailed automatically and remain available for manual copying. Resending a pending invitation atomically revokes the previous link and issues a new one; requests are limited to once a minute. SMTP failures are reported without discarding the invitation.

## 5. Profiles and private notes — complete

Users edit their own name, contacts, and time zone. Administrators can read member profiles and change or clear job titles. They cannot silently change another account's identity or email.

A private note belongs to its author membership and target membership within one team. It is optional and limited to 4000 characters. Other administrators and employees cannot access that author's note through profiles, lists, ratings, or note routes.

## 6. Statistics, GOAT, and history — complete

The server calculates productivity and punctuality. Monthly GOAT requires at least five completed or unfinished overdue tasks. Scores combine 60% productivity and 40% punctuality. Future open tasks do not reduce the current score. Late completion counts as completed but lowers punctuality.

Tasks belong to the month of their deadline in the team's time zone. Ratings may update after late completion. Equal scores share ranks; insufficient data stays null, while an actual zero remains visible.

Administrators receive the full ranking. Other members receive only the leaders and their personal result. The interface does not single out a lowest-rated person when everyone ties or only one person qualifies.

Task creation, update, and completion record immutable event snapshots in the same transaction. Daily charts reconstruct historical deadlines and assignees, account for calendar boundaries and daylight saving, omit future points, and use null for unknown older states. Missing history is drawn as gaps.

## 7. Frontend integration — complete

The frontend uses cookie-authenticated API requests, protected routes, team switching, real mutations, field errors, and loading/retry states. It refreshes after actions, when the window regains focus, and every 30 seconds in a visible tab. It contains no demo business records or browser-local task storage.

The integrated browser checks use real API routes, a temporary database, and captured emails. PostgreSQL mode creates and removes its own separate test database. Working application data and real email delivery are not used by these checks.

## Remaining work

- Public hosting and deployment configuration, including HTTPS, cookie settings, explicit CORS origins, and further API hardening.
- Database migrations for future schema changes.
- A dedicated backend dependency manifest.
- An authenticated password-change flow if added to the product scope.

The development-only database reset router is not registered in the public application. Database connection credentials are loaded from the ignored local `.env`.
