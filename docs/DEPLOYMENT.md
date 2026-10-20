# Free hosting

DeathLine can run as one free Render web service, with PostgreSQL on Neon and transactional email through the Brevo HTTPS API. No custom domain is required. Check each provider's current limits before creating resources; do not select a paid tier.

## Accounts and plans

- **Render Free:** https://dashboard.render.com/ — one Docker web service for the frontend and API. It sleeps after inactivity, so the first visit may take about a minute. Its filesystem is temporary. Standard outbound SMTP ports are blocked.
- **Neon Free:** https://console.neon.tech/ — a separate PostgreSQL project. Keep the free plan and choose a European region near Render's Frankfurt region. The current free plan includes 1 GB of storage and 100 CU-hours per project per month; compute sleeps when idle. Keep independent database backups.
- **Brevo Free:** https://app.brevo.com/ — up to 300 emails per day on the current free plan. Verify the sender email and complete the transactional account activation. Gmail senders may be rewritten to a Brevo sending domain; a personal domain improves deliverability but is optional for initial setup.

The local database is not uploaded or reset. A new cloud database starts empty. Moving existing records is a separate, explicit migration.

## Deployment settings

The repository includes `render.yaml` and a multi-stage `Dockerfile`. Create a Render Blueprint from this repository and the `main` branch, or create a Docker Web Service with these settings:

| Setting | Value |
| --- | --- |
| Runtime | Docker |
| Plan | Free |
| Region | Frankfurt |
| Dockerfile | `./Dockerfile` |
| Health check | `/healthz` |
| Port | Use Render's `PORT` automatically |

Set these **server environment variables** in Render, never in Git or the frontend:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Neon PostgreSQL connection string, including TLS options such as `sslmode=require` |
| `MAIL_PROVIDER` | `brevo` |
| `MAIL_FROM_EMAIL` | Your verified Brevo sender email |
| `BREVO_API_KEY` | Your Brevo API key, not an SMTP password |
| `SMTP_FROM_NAME` | `DeathLine` |
| `COOKIE_SECURE` | `true` |

Neon's `postgresql://` connection format is accepted and uses the psycopg driver. A pooled Neon URL is supported. `FRONTEND_URL` automatically uses `RENDER_EXTERNAL_URL`; set it explicitly only if using your own domain. Leave `VITE_API_URL` unset: the browser uses `/api` on the same origin, and no cross-site cookie settings are needed.

The image installs pinned Python dependencies, builds the frontend with its frozen pnpm lockfile, then runs as a non-root user. It excludes local `.env` files, dependencies, IDE settings, tests, and local database files from the build context. Startup creates missing tables without dropping existing ones. Existing columns still require explicit migrations.

## Verification

After deployment, check:

1. `/healthz` returns `{"status":"ok"}` and `/api/docs` opens the API documentation.
2. `/`, `/register/`, `/verify-email`, `/reset-password`, and `/invite/example` return the frontend on direct navigation. Missing API routes and missing assets must return 404.
3. Sign in, reload, and sign out. The session cookie must have `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
4. Verify that account verification, password reset, and team invitation emails contain the public HTTPS URL and arrive at the intended inbox. An email accepted by Brevo can still be delayed or filtered; inspect Brevo's transactional logs if delivery fails.
5. Restart the service and confirm that cloud records persist in Neon.

Health checks do not query PostgreSQL and therefore do not keep Neon compute awake. SQL parameter logging and HTTP access logs are disabled in the production image so session/reset/invitation tokens are not copied into routine logs.

## Local development

Existing local settings continue to use Gmail SMTP with `MAIL_PROVIDER=smtp`. Start the API and Vite as described in the main README. To check the built site on one local origin, build the frontend, then start the API with `SERVE_FRONTEND=true`; keep `COOKIE_SECURE=false` only for local HTTP.

## Limits and later work

Free services are suitable for a small demo or pilot, with cold starts, quotas, and no guaranteed availability. Do not add keep-alive traffic to defeat free-tier sleeping. Review usage in the provider dashboards and export database backups. Before wider public use, add database migrations and stronger abuse/rate controls for sign-in, account creation, and outgoing email.

Sources: [Render Free](https://render.com/docs/free), [Neon pricing](https://neon.com/pricing), [Brevo free plan](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [Brevo transactional API](https://developers.brevo.com/docs/send-a-transactional-email).
