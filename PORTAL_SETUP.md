# Client Portal & Brand Tensor — setup

## 1. The one Google Sheet backend
Create a Google Sheet with **4 tabs**, named exactly:

| Tab | Header row |
|---|---|
| `Leads` | Timestamp \| Name \| Business \| Email \| Phone \| Message \| Page |
| `Messages` | Timestamp \| Client \| From \| Text |
| `Goals` | Timestamp \| Client \| GoalsJSON |
| `BrandTensor` | Timestamp \| Client \| Website \| GBP \| Instagram \| Facebook \| Description \| OverallScore \| RawResult |

In the sheet: **Extensions → Apps Script**, delete the placeholder code, paste in `google-apps-script.gs`.

**Deploy → New deployment → Web app** — Execute as **Me**, Who has access **Anyone** → Deploy → copy the `/exec` URL.

Paste that URL into `SHEET_ENDPOINT` at the top of `script.js`. This one endpoint now serves lead forms, portal messages, weekly goals (backup log), and Brand Tensor.

## 2. Client access codes (portal-login.html)
Open `portal-login.html`, find the `CLIENTS` object near the bottom, add one line per client:
```js
const CLIENTS = {
  "DEMO2026": "Demo Client",
  "TF2026": "Tribe Fortis"
};
```
**Important:** this is a client-side code check, not real authentication — anyone who reads the page source can see the codes. It's enough to keep a client's dashboard from showing up in casual search/browsing, but don't put anything genuinely sensitive behind it. For real security later, swap this for a proper backend login (e.g. Google Sign-In restricted to each client's email, verified server-side).

## 3. Brand Tensor (the AI positioning-gap scorer)
Brand Tensor calls an open-source Llama model (via Groq, free) to compare a client's stated positioning against their live website + Google Business Profile text.

1. In the Apps Script project: **Project Settings → Script Properties → Add property**
   `GROQ_API_KEY` = your free Groq API key — sign up at console.groq.com, no cost.
2. That's it — the portal's Brand Tensor tab will now run real analysis instead of showing the "not configured" message.

**Known limits, by design, not bugs:**
- Instagram and Facebook links are logged for your own manual review only. Both platforms block simple server-side scraping (they need a logged-in session to show real content), so the automated score is based on the website + GBP text, not social content.
- Website/GBP fetches sometimes come back empty (JS-heavy sites, pages that block bots). Brand Tensor will say so in its notes rather than guessing.
- Each run costs a small amount on Groq's free tier (rate-limited, no cost).

## 4. Live GSC / GA4 / Meta Ads data (not included yet)
The Overview tab is a working shell — Google/Meta both require a real backend OAuth flow (a registered app, a consent screen, token storage) to pull a client's actual Search Console, GA4, or Meta Ads numbers. That's beyond what a static site + Apps Script can do safely — API secrets can't live in browser JavaScript. When you're ready to build this for real, a small serverless backend (e.g. a few Vercel functions) handling the OAuth handshake and proxying the API calls is the standard approach — happy to build that as a next phase.

Until then, the "Connect" buttons explain this, and clients can always ask for a manual pull via **Messages**.

## 5. Weekly Goals
Goals live in the browser's `localStorage` per client (so they persist for that client, on that device) and are also logged to the `Goals` sheet as a backup whenever something changes — you can see the history there, though the portal itself always trusts the local copy first.
