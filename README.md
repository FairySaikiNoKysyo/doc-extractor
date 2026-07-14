# AI Document Extractor — vision + structured output

Upload a document image (receipt, invoice, business card, table, form…) and get
**structured data** back — key/value fields plus any tables — that you can
export to CSV or ask questions about. Powered by **Gemini Vision** with
constrained JSON output.

Demonstrates **multimodal AI + structured (schema-constrained) output** — the
third capability in this portfolio, alongside retrieval (RAG) and agentic
tool-use.

## What it shows

- **Multimodal LLM** — sends an image to Gemini Vision and reads it.
- **Structured output** — a JSON schema forces clean, typed results (no fragile
  prompt-and-pray parsing).
- **Practical UX** — drag-drop upload, live preview, fields + table rendering,
  one-click CSV export, and image-grounded Q&A.

## Stack

| Concern   | Choice                                                  |
| --------- | ------------------------------------------------------ |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind v4     |
| AI        | Google **Gemini Vision** (`@google/genai`, free)       |
| Deploy    | Vercel (free) — single env var, no database            |

## How it works

```
Image (browser) ──base64──▶ /api/extract
                              │
                              ▼
                 Gemini Vision + responseSchema
                              │
                              ▼
        { documentType, fields[], table{columns,rows} }  ──▶ table + CSV

/api/ask : image + question ──▶ Gemini ──▶ grounded answer
```

No data is stored — extraction is stateless. The only secret is the Gemini key,
used server-side in the route handlers.

## Setup

1. Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com)
   (no card).
2. ```bash
   cp .env.local.example .env.local   # set GEMINI_API_KEY
   npm install
   npm run dev
   ```
3. Open http://localhost:3000, drop in a document photo, hit **Extract data**.

## Deploy

Push to a public GitHub repo → import into [Vercel](https://vercel.com) → add
`GEMINI_API_KEY`. Done.

## Project layout

```
src/
  app/
    page.tsx              renders the extractor UI
    api/extract/route.ts  image → structured JSON
    api/ask/route.ts      image + question → answer
  components/Extractor.tsx  upload, results table, CSV, Q&A
  lib/gemini.ts          vision calls + extraction schema (LLM isolated here)
```

## Swapping the LLM

`src/lib/gemini.ts` is the only AI-specific file. Claude
(`claude-opus-4-8`) and OpenAI are also multimodal with structured output —
swap the client there; the UI and routes are unchanged.
