# StagePulse Map - Hackathon UI Starter

StagePulse Map is a no-login live audience interaction web app for Cloud Summit at Science World.

## What it demonstrates

- Audience-facing live poll at the top of the screen
- Admin-customizable poll question and options
- Science World venue map with Level 1, Level 2, and OMNIMAX
- Click existing glowing points to target booths and zones
- Add Booth mode: click the map, name a booth, and place a new point
- Submit map-based pulses and questions without login
- Search and filter previous questions, zones, and pulses
- Built-in stage readout for duplicate questions and safety trends
- OpenAI-powered comment summary for the admin view
- Elastic-facing metrics:
  - Indexed Questions
  - Duplicated Questions
  - Blocked Words
  - Suspicious Burst

## Run locally

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite.

## Admin mode

Open the app with `?admin=1` to reveal:

- Poll editing controls
- OpenAI summary controls
- Saved browser API key management

Example:

```text
http://localhost:5173/?admin=1
```

## OpenAI summary setup

You have two ways to connect OpenAI for comment summaries:

### Option 1: Environment variable

Copy `.env.example` to `.env` and set:

```bash
VITE_OPENAI_API_KEY=your_key_here
VITE_OPENAI_SUMMARY_MODEL=gpt-5.4-mini
```

### Option 2: Browser key in admin mode

In `?admin=1`, paste a key into the admin summary panel and save it locally in that browser.

This is convenient for a prototype, but it is not the right production security model.

## Suggested production stack

- Frontend: Next.js or Vite React
- Hosting: Vercel, Netlify, Cloudflare Pages, or any hackathon-friendly free tier
- Backend proxy for OpenAI keys and summarization requests
- Elastic Cloud:
  - Elasticsearch for question, pulse, and booth indexing and search
  - Elastic Security or custom detection rules for banned words, repeated submission bursts, and bot-like behavior
  - Elastic Observability for traffic, API errors, latency, and live demo health

## Important MVP principle

Do not build login. Use anonymous browser IDs stored in localStorage when you implement backend rate limiting.
