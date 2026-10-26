# Client onboarding & deployment registry

One paying client = one folder under `clients/`. That folder is the single
source of truth for that client's config and credentials.

`clients/` is **gitignored on purpose**: this repo is pushed to every client's
GitHub repo, so client names, domains, tokens, and account IDs must never be
tracked here.

## Layout

```
clients/
├── koutobi/
│   ├── .env        # secrets: Supabase, Cloudflare, R2, MCP/CLI tokens
│   └── meta.json   # non-secret record: domain, accounts, plan, status
└── maktaba/
    ├── .env
    └── meta.json
```

Templates live in `templates/client.env.template` and
`templates/client.meta.json`.

## Commands

| Command | What it does |
|---|---|
| `npm run clients` | List every client (slug, status, domain, project, bucket, version) |
| `scripts/clients-list.sh --json` | Same list as JSON |
| `scripts/new-client.sh <slug> "<name>" <domain> [git-url]` | Create the folder + optional git remote |
| `scripts/client-env.sh <slug>` | Print a non-secret summary of that client |
| `eval "$(scripts/client-env.sh <slug> exports)"` | Load a client's env into the current shell |
| `scripts/use-client.sh <slug>` | Link `.env.local` so `npm run dev` uses that client |
| `scripts/oc.sh <slug>` | Start OpenCode with that client's MCP config |
| `scripts/setup-client-db.sh <slug>` | Bootstrap a fresh DB (schema + migrations, optional seed) |
| `scripts/deploy.sh <slug>` | Validate + build + deploy that client |

`scripts/deploy.sh` refuses to run if `meta.json` and `.env` disagree about the
Supabase project or domain, and it links `.env.local` so the build bakes the
same values as the deploy.

## New client checklist

### 1. Accounts (client-owned)

The client creates the accounts under their own Gmail and invites you. Do not
keep their Gmail password.

- **GitHub**: create a private repo (or an org), invite your account as
  collaborator/admin.
- **Supabase**: create an organization + project, invite your account to the
  org.
- **Cloudflare**: create the account + zone, invite your account as a member.
- **Billing**: decide who pays. Supabase Free pauses after ~7 days of
  inactivity — production clients should be on Pro or accept the risk.

### 2. Create the local folder

```bash
scripts/new-client.sh maktaba "مكتبة الطلاب بالعلم" maktaba.ma \
  https://github.com/<client>/koutobi-ma.git
```

This creates `clients/maktaba/.env` and `meta.json` and adds the git remote.

### 3. Fill `clients/<slug>/.env`

Copy values from the client's dashboards:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Project Settings → API.
- `SUPABASE_PROJECT_REF` — the `<ref>` in the project URL.
- `SUPABASE_ACCESS_TOKEN` — Account → Access Tokens (starts with `sbp_`).
  This is what the Supabase MCP uses; do not reuse another client's token.
- `SUPABASE_DB_URL` — Project Settings → Database → Connection string
  (Session pooler). Only needed to bootstrap a fresh database.
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` —
  API token scoped to that account only (Workers Scripts:Edit,
  Cloudflare R2:Edit, Zone:Read, DNS:Edit).
- `R2_*` — R2 API token + bucket + public URL.
- `CLIENT_SLUG`, `CLIENT_DOMAIN`.

Keep the file `chmod 600`.

### 4. Fill `clients/<slug>/meta.json`

Non-secret record: store name, domain, contact, GitHub repo/remote, Supabase
project/org/plan, Cloudflare account/zone/bucket/worker, billing, notes.
**Never put tokens or passwords here.**

### 5. Prepare the backend

```bash
eval "$(scripts/client-env.sh maktaba exports)"

# Supabase: schema.sql -> migrations -> (optional) seed
scripts/setup-client-db.sh maktaba            # add --with-seed for demo data

# R2 bucket + public URL
npx wrangler r2 bucket create "$R2_BUCKET"
```

Then in the Supabase dashboard:

- Auth → URL Configuration: set the client domain as Site URL and redirect.
- Create the first admin (see `src/pages/admin/AdminSetup.jsx` /
  `claim_first_admin`).
- Enable leaked-password protection and backups.
- Optional: custom SMTP (default Supabase mail is rate-limited).

### 6. Deploy

```bash
scripts/use-client.sh maktaba     # local dev now points at the client
scripts/deploy.sh maktaba         # verify + build + deploy
git push maktaba main             # publish the same code to their repo
```

### 7. Smoke test

- Admin login + first admin works.
- Image upload writes to the client's R2 bucket and the public URL loads.
- One test order (then delete the test rows).
- Contact/WhatsApp/settings show the client's details, not koutobi's.
- DNS + HTTPS valid on the client domain.
- `meta.json` → `status: live`, `deploy` dates filled (the deploy script
  updates version/commit/date automatically).

## MCP credentials

`clients/<slug>/.env` is also the MCP credential source:

- Supabase MCP URL is project-scoped from `${SUPABASE_PROJECT_REF}` and
  authenticated with `Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}`.
- Cloudflare MCP servers use OAuth; sign in with the client's Cloudflare
  account on first use (`/mcps` → server → sign in).
- OpenCode resolves `{env:...}` from its **server** process. Start it with:

```bash
scripts/oc.sh maktaba
```

`scripts/oc.sh` loads the client env and uses `opencode --standalone`, so the
MCP config points at that client. Starting plain `opencode` uses the shared
background server, which will not see the client's env.

Adding a new client changes the token; no config file edits are needed.

## Security rules

- Never commit `clients/`, a real `.env`, or any token. `npm run verify` runs
  `scripts/check-no-secrets.sh`, which fails on tracked `clients/` files.
- One token per client, scoped to that client's account/project. Never reuse
  koutobi's tokens for a client.
- Store passwords/2FA recovery codes in a password manager, not here.
- On offboarding: remove your collaborator access, revoke the API tokens and
  PAT, then archive `clients/<slug>/` (`status: archived`) instead of deleting
  it, so history stays traceable.

## Backups

`clients/` exists only on the operator's laptop. To survive a disk failure,
back up `clients/*/meta.json` (no secrets) to a private repo such as
`koutobi-clients`. Keep `.env` files in the password manager or an encrypted
backup — never in a git repo.
