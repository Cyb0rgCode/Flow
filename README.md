# Flow 〰️ — System Friction Log

A dead-simple, low-friction burnout tracker. **One number a day, ~10 seconds.**

Instead of logging sleep, mood, energy, and hours, you collapse everything into a
single subjective metric: **System Friction**, rated 1–5. You don't read
individual days — you watch the *rolling trend*.

| Rating | State | Meaning |
|:--:|---|---|
| **1** | Flow | Zero friction. Tasks felt light, focus was natural. |
| **2** | Normal | Moderate effort to start, steady execution. A productive day. |
| **3** | Resistance | High friction. Starting felt heavy, easily distracted. |
| **4** | Stuck | Severe resistance. Staring without executing. Deep fatigue. |
| **5** | Crash | Total system rejection. Can't focus or care. Cynicism. |

## What it does

- Tap **1–5** (or press the keys `1`–`5`) to log today. Optional ≤3-word note.
- **Tripped circuit breaker** alerts that fire automatically:
  - **Three consecutive 3s** → early warning flare (lighten the load).
  - **A single 4/5** (or three 4s) → mandatory downshift; the 3-phase protocol
    appears inline.
- A 14-day rolling **trend chart** and average.
- **Export to CSV** and **Reset**.

All data stays on your device in `localStorage` — there is no backend and nothing
is ever uploaded.

## Run locally

It's a static site — no build step, no dependencies. Just open `index.html`, or
serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy on GitHub Pages

This repo deploys automatically via GitHub Actions
(`.github/workflows/deploy.yml`) on every push.

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to the deploy branch — the workflow publishes the site and prints the
   live URL in the run summary.

The site is plain HTML/CSS/JS at the repo root, so it works under the
`/<repo>/` Pages subpath with no extra configuration. (`.nojekyll` is included
so files are served verbatim.)
