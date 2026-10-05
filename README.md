# Admission Management System

An Express, EJS, and MySQL application for admitting students, delivering portal PINs by SMS, and providing authenticated admission documents.

## Requirements

- Node.js 18 or newer
- MySQL 8 or newer
- An Arkesel account for SMS delivery

## Setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Create the database named by `DB_NAME` and grant the configured database user access to it.
3. Install packages with `npm install`.
4. Run `npm start`.

On startup, the application creates or safely upgrades its `students` table. It refuses to start when required configuration is absent, the JWT secret is shorter than 32 characters, or the admin password is shorter than 8 characters.

## Commands

- `npm start` — start the application
- `npm run dev` — start with automatic reload
- `npm test` — run unit tests
- `npm run check` — check JavaScript syntax

## Routes

- `/admin/login` — administrator login
- `/admin` — student management dashboard
- `/admin/users` — super-admin-only staff account management
- `/student/login` — admitted-student login
- `/student/dashboard` — authenticated documents portal
- `/health/live` — minimal liveness response

Admission documents are stored in `documents/`, outside the public static directory, and are served only after student authentication.

Admission-letter dates are configured with `ACADEMIC_YEAR`, `REPORTING_DATE`, `REPORTING_TIME`, and `FEE_DEADLINE`. Date values use `YYYY-MM-DD` format so the heading, reporting instructions, and payment deadline remain consistent without editing the template.

## Security and operations

- Never commit `.env` or real credentials.
- Use HTTPS and set `NODE_ENV=production` in production so authentication cookies are marked secure.
- Rotate the database password, SMS API key, admin password, and JWT secret if they have ever appeared in source control.
- SMS failures are recorded in the admin dashboard. “Resend PIN” generates a new PIN and invalidates the previous one.
- Back up the database before deploying schema changes.

Existing installations with plaintext legacy PINs are migrated to scrypt hashes the next time each student successfully signs in. Newly generated PINs are stored only as salted hashes.

## Administrator roles

The first startup creates one super administrator using `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD`. For compatibility, an existing `ADMIN_PASSWORD` is accepted only as the initial bootstrap password; reset it through **Manage Users** immediately.

- **Super admin:** manage students and administrator accounts.
- **Admin:** add students, admit students, resend PINs, and use bulk admission.

Disabling an administrator or resetting their password invalidates all of that account's existing sessions.

The super admin dashboard can display issued student PINs. Login verification still uses a salted hash; the displayed copy is separately protected with authenticated encryption using `PIN_ENCRYPTION_KEY`. Existing PINs issued before this feature show as unavailable until **Resend PIN** generates a new one.

If the bootstrap credentials are unavailable, set `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` in `.env`, then run `npm run admin:reset-super`. This activates the account, updates its credentials, and invalidates its existing sessions.
