# YT Collector — Frontend

<img src="public/logo.png" alt="YT Collector" width="80" />

Next.js app deployed on Vercel. Handles the UI, API routes, cron jobs, and Whisper callback.

---

## Prerequisites

- Node.js 20+
- A Vercel account
- Supabase project running (Phase 1 complete)
- Cloudflare R2 bucket created (Phase 2 complete)
- OCI FastAPI service running (Phase 3 complete)

---

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Fill in `.env` with your values (see env vars table below).

3. Start the dev server:
   ```bash
   npm run dev
   ```

---

## Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `OCI_API_URL` | Base URL of the OCI FastAPI instance, e.g. `http://<ip>:8000` |
| `OCI_API_KEY` | Shared bearer token for OCI API authentication |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for R2 assets |
| `OWNER_EMAIL` | Email address of the owner — auto-approved on first sign-in |
| `WHISPER_CALLBACK_SECRET` | Shared secret to validate incoming Whisper callbacks |

---

## Deploying to Vercel

1. Push the `frontend/` folder to a GitHub repo.
2. Import the project in Vercel dashboard.
3. Set all environment variables in Vercel → Settings → Environment Variables.
4. Deploy.

### Cron Jobs

Defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/channels",     "schedule": "0 0 * * *" },
    { "path": "/api/cron/queue-runner", "schedule": "*/5 * * * *" }
  ]
}
```

Crons only run in Vercel production. Test locally by calling the routes directly.

---

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx                        # / — Home
│   ├── channels/page.tsx               # /channels
│   ├── topics/page.tsx                 # /topics
│   ├── topic/[id]/page.tsx             # /topic/[id]
│   ├── video/[id]/page.tsx             # /video/[id]
│   ├── search/page.tsx                 # /search
│   ├── admin/page.tsx                  # /admin (owner only)
│   └── pending/page.tsx                # /pending (unapproved users)
├── app/api/
│   ├── cron/
│   │   ├── channels/route.ts           # Daily channel scan
│   │   └── queue-runner/route.ts       # Every 5 min queue processor
│   ├── topic/search/route.ts           # On-demand topic search
│   └── whisper/callback/route.ts       # Whisper transcript receiver
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client (service role)
│   └── r2.ts                           # R2 delete helper
├── vercel.json
└── .env
```
