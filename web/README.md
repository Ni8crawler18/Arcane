# OncoFollow — Doctor Dashboard

A Next.js web dashboard for OncoFollow (see `../docs/healthathon_submission.txt`
and `../docs/healthathon/`) — the doctor-facing UI for the cancer follow-up
concept, deployable to Vercel with zero external services to provision.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, pick a doctor, and you're in. Sample patients
and follow-ups are seeded automatically on first load.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Import Project" → select the repo → set **Root Directory**
   to `web/`. No environment variables or database are required.
3. Deploy. That's it.

## What's real here vs. what's a stand-in

- **Cedar authorization is real** — `@cedar-policy/cedar-wasm` (the official
  WASM build of the same Cedar engine `cedarpy` wraps in the original Python
  prototype) evaluates the actual policy in `lib/cedar.ts` on every request.
  A doctor can only act on their own patients, and the follow-up agent can
  only read notes and send a `followup_reminder` - enforced the same way as
  the Python version, not reimplemented as a plain `if` check.
- **The follow-up message drafting is a template function**, not a live
  Strands Agents SDK call. Strands is Python-only and doesn't run in a
  Vercel/Node environment, so `lib/agent.ts` reimplements the same
  *guarded-action pattern* (read notes → Cedar check → send → Cedar check)
  without literally running the Python agent. See the comment at the top of
  `lib/agent.ts`. If you want a live model in the loop here, that function is
  the one place to add an LLM API call.
- **Data is in-memory**, seeded fresh per server instance (see
  `lib/store.ts`) — same fallback philosophy as the Python prototype's
  `adios/db.py`. Fine for a demo; swap for a real database before this holds
  actual patient data.

## Structure

```
app/
  page.tsx                    - doctor picker (landing page)
  dashboard/page.tsx          - patient list, sorted by follow-up urgency
  patients/[id]/page.tsx      - notes, search, schedule follow-up, agent activity log
  lookup/page.tsx             - look up any patient by ID - the real Cedar-deny demo
  api/                        - route handlers (patients, notes, followups, lookup)
lib/
  cedar.ts                    - the Cedar policy + authorize() wrappers
  agent.ts                    - the guarded follow-up agent
  store.ts                    - in-memory seeded data
  types.ts
```
