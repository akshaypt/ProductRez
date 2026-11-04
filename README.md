# ProductRez

The all-in-one career platform for product managers and aspiring PMs, in the **US and India**. A PWA that installs on phones and runs on desktop.

| Feature | Access |
|---|---|
| **PM Resume Scorer**: impact, ownership, 8 PM competencies, clarity, ATS safety; findings as a P0/P1/P2 ticket backlog | **Free: 1 score per account**, unlimited on any paid plan |
| **PM Resume Writer**: 6 ATS-safe LaTeX templates, bullet coach, live score, `.tex` / Overleaf / print-PDF export | Paid |
| **Fresh Jobs**: PM roles posted in the last 2 days, scraped every morning (07:00 AM IST) | Paid |
| **Learn**: 65 verified resources + 5 guided paths with progress | Paid |

**Pricing (INR, one-time, no auto-renew):** 1 month ₹299 · 6 months ₹599 · Lifetime ₹999. Payments via Razorpay.

## Run it locally (no backend needed)

```bash
npm install
npm run dev          # demo mode: sign-in is a stub, "Buy" unlocks instantly, jobs are labelled samples
npm test             # scoring engine, LaTeX templates (compiled with pdflatex if installed), job parser
npm run build && npx vite preview --port 4173 &
npm run e2e          # full browser journey (needs `npm i -D playwright`)
```

Demo mode is selected **at build time**: when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set, the demo adapter and all bundled sample/paid data are removed from the client bundle (verified: the paid library never ships to the browser).

## Architecture

```
src/                         React + Vite PWA (routes lazy-loaded)
  lib/api/                   Api interface → supabase.ts (prod) | local.ts (demo)
  pages/                     Landing, Score, Writer, Jobs, Learn, Pricing, Account
supabase/
  migrations/                schema + Row Level Security (the paywall lives here)
  functions/_shared/scoring  PM scoring engine (pure TS, shared by browser + edge)
  functions/_shared/latex    6 LaTeX templates + escaping (pure TS, shared)
  functions/score-resume     enforces "1 free score" atomically (consume_score)
  functions/export-resume    server-side LaTeX export (paid only)
  functions/create-order | verify-payment | razorpay-webhook   Razorpay → grant_plan()
  functions/rewrite-bullet   optional AI rewrites (paid; never invents numbers)
  seed.sql                   generated from src/data/resources.json
scripts/scrape-jobs.ts       daily ingestion (GitHub Action, 01:30 UTC)
```

**What is enforced where**

| Rule | Enforcement |
|---|---|
| 1 free score per account | Postgres `consume_score()` under an advisory lock, called from the `score-resume` edge function |
| Jobs / resources / saved resumes are paid | RLS policies using `has_access(auth.uid())`; the client cannot read them without a valid plan |
| Jobs older than 2 days are hidden | RLS: `posted_on >= current_date - 1` **and** the scraper purges stale rows |
| LaTeX export is paid | `export-resume` edge function checks the entitlement |
| Payments can't be forged | HMAC signature verification + amount check in the webhook; `grant_plan()` is idempotent per payment id and not callable by clients |

## Go live checklist

1. **Supabase**: create a project; `supabase db push`; run `supabase/seed.sql`; enable Email OTP (and Google, optional) auth.
2. **Edge functions**: `supabase functions deploy score-resume export-resume create-order verify-payment razorpay-webhook rewrite-bullet`, then `supabase secrets set RAZORPAY_KEY_ID=… RAZORPAY_KEY_SECRET=… RAZORPAY_WEBHOOK_SECRET=…` (+ `ANTHROPIC_API_KEY` for AI rewrites).
3. **Razorpay**: add a webhook to `…/functions/v1/razorpay-webhook` for `payment.captured`. For US customers, enable **international payments** on the Razorpay account (prices are INR).
4. **Hosting**: deploy `dist/` to any static host with SPA fallback (Vercel/Netlify/Cloudflare Pages) with the two `VITE_` env vars set.
5. **Jobs**: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets; the `Daily PM jobs drop` workflow runs at 01:30 UTC.
6. Update `ALLOWED_ORIGINS` for the edge functions to your domain.

## Things you should know

- **LinkedIn scraping violates LinkedIn's User Agreement** and GitHub runners are frequently rate-limited. The scraper is deliberately low-volume and never wipes existing jobs when blocked, but for a durable product, swap `fetchPage` for a licensed jobs data provider (the rest of the pipeline is source-agnostic). Review the legal risk before charging for it.
- **"ATS score" honesty**: no real ATS publishes a 0–100 score. The UI says so. We measure parse-ability, structure, PM-specific content quality and keyword overlap.
- **PDF output**: the best export is the `.tex` (compile with pdfLaTeX / Overleaf). The in-browser "Print / Save as PDF" is a quick path that mirrors the template but is not byte-identical. A server-side LaTeX compile service is the natural next step.
- The Writer's live preview is an HTML approximation of the LaTeX output.
- Resource links were verified at build time; `npm run resources:check` (monthly workflow) catches link rot.

## Design & motion

- **Look:** strictly monochrome, black and white, dark-led. The accent colour *is* ink (white on black, black on white). Status is shown with a luminance ramp and labels, never hue alone (P0 solid, P1 outlined, P2 muted; the score gauge runs grey → white). Light mode is the same system inverted (Account → Theme).
- **Marketing site** (`src/components/mk/*`, `src/styles/mk.css`): framed column with hairlines, labels that sit on drawing rules, alternating black/white sections. Each section scopes its own colour tokens, so any component placed inside adapts automatically.
- **Motion:** one easing curve everywhere (`cubic-bezier(0.165, 0.84, 0.44, 1)`), Lenis inertial scrolling (marketing only), one shared scroll ticker for all scroll-linked effects (`src/lib/motion.ts`), sticky stacking bands, scroll-scrubbed text, a self-playing hero demo with a scripted cursor, and an ATS-parsing simulation. Everything respects `prefers-reduced-motion`.
- **App:** dark icon rail with a sliding indicator and tooltips, ⌘K command palette, section-tab Writer with a "Finish up & preview" step (template modal, live gauge, keyword targeting).

## Security note: what must never ship in the browser bundle

The LaTeX generator (`buildLatex` and its macro definitions) and the paid library are deliberately kept out of production client bundles; the export is served by the `export-resume` edge function. Template macros are wrapped in a function because `String.raw` tagged templates count as side effects and would otherwise be bundled. To re-check after changes:

```bash
VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=x npx vite build --outDir /tmp/prod
for n in rzroleone newcommand "Continuous Discovery Habits" pr.demo.user; do grep -rl -- "$n" /tmp/prod/assets | wc -l; done   # all must be 0
```
