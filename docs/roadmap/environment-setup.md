# Environment Setup Contract

## Status

Approved setup contract; resources are created by Khang because they establish
external accounts, consent configuration, spend boundaries, and secrets. Never
commit or paste secret values into issues, pull requests, screenshots, logs, or
chat.

## Local baseline

- Node.js 24.17.0 from `.nvmrc`.
- npm and the committed `package-lock.json`.
- Next.js local origin `http://localhost:3000` by default. If that port belongs
  to another worktree, use an explicitly recorded alternative; never stop an
  unrelated server.
- A Convex development deployment only. Local development must not connect to a
  future production deployment.

The ignored local `.env.local` contains only application/deployment bindings:

| Variable | Purpose |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Convex CLI development deployment reference |
| `NEXT_PUBLIC_CONVEX_URL` | Browser-safe Convex client URL |
| `CONVEX_SITE_URL` | Convex HTTP Actions/Auth site origin |

Spell `CONVEX_DEPLOYMENT` exactly. These local bindings do not make server-side
secrets available to Convex functions.

## Google Cloud development project

Create a standalone project such as `pick-a-date-dev`. Do not place the MVP in a
shared production project.

Configure Google Auth Platform:

1. Audience: **External**, publishing status **Testing**.
2. Add the owner's Google account as a test user.
3. App name and support/developer contact appropriate for Pick-a-Date.
4. Request only `openid`, `userinfo.email`, and `userinfo.profile`.
5. Create a **Web application** OAuth client named `Pick-a-Date Local`.
6. Add `http://localhost:3000` as an authorized JavaScript origin.
7. After the Convex deployment exists, add
   `https://<development-deployment>.convex.site/api/auth/callback/google` as an
   authorized redirect URI.

Do not enable Google Calendar API. Calendar composition requires no Google OAuth
scope. Create a separate Google Cloud production project/client later rather
than promoting development secrets.

## Convex development project

Create project `pick-a-date` with a development deployment. Record its public
client URL and `.convex.site` URL locally through the standard Convex bootstrap;
do not hand-edit generated deployment identifiers.

Set these server-side development environment variables directly in Convex:

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Allowed application origin, initially `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Development Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Development Google OAuth client secret |
| `JWT_PRIVATE_KEY` | Convex Auth signing material |
| `JWKS` | Convex Auth public verification keys |
| `OWNER_EMAIL` | Normalized allowlisted Google account |

Generate Convex Auth key material using its supported setup flow. Do not invent,
copy between environments, or expose these values as `NEXT_PUBLIC_*` variables.
Values present only in local `.env.local` must be transferred through the
authenticated Convex environment command or dashboard before server functions
can use them.

## Resend development

Implementation can initially use Resend's safe development behavior. Before a
real recipient test:

- verify a sender domain controlled by the owner;
- configure a development API key only in the Convex development environment;
- configure explicit sender address and owner delivery address;
- disable open and click tracking; and
- authorize each real email test separately because it sends an external
  message.

Use a distinct production API key later. Provider free-tier limits are an
operational constraint, not a delivery guarantee.

## Vercel and production

Vercel Hobby is approved for the personal MVP, but production setup is deferred
until the application passes local and provider-development gates. Production
requires:

- a separate Convex production deployment;
- a production Google Cloud OAuth project/client and exact redirect/origin URLs;
- a production Resend key and verified sender;
- owner-approved domain and DNS changes;
- Vercel environment variables pointing only to production resources; and
- a documented rollback and smoke-test plan.

No agent may deploy, spend, modify DNS, or send real email solely because this
roadmap exists.

## Setup acceptance checklist

- Google sign-in reaches the development callback without redirect mismatch.
- The identity has a verified email and only the allowlisted owner is accepted.
- Convex local code points to the development deployment.
- Secrets are absent from Git history, client bundles, logs, and screenshots.
- Calendar composition works without Calendar API or additional scope.
- Resend development and real-delivery gates are reported separately.
