# N-ATLAS AI Climate Tutor — Integration Notes

Implementation of `Shara_Climate_Academy_N-ATLAS_Integration_Guide.docx` (v1.0, 9 Oct 2026):
a text-based AI Climate Tutor powered by Nigeria's N-ATLAS model, integrated into the
existing academy without changing its structure, URLs or design system.

## What was built

| Piece | File | Notes |
| --- | --- | --- |
| Server API route | `app/api/natlas-chat/route.ts` | Next.js Route Handler (guide §6, adapted from Vite example). Verifies learner session, validates payload, rate-limits, calls N-ATLAS, returns only `{ answer, model }`. |
| Transcription route | `app/api/natlas-transcribe/route.ts` | Voice-note transcription via the gateway's `POST /v1/audio/transcriptions` (Whisper ASR per language). Same auth, origin and rate-limit policy; audio capped at 12 MB; transcript returned for learner review. |
| Shared config | `lib/natlas-config.ts` | Single source for base-URL resolution and the not-configured message across both routes. |
| Admin SDK helper | `lib/firebase-admin.ts` | ID-token verification. Works with the project ID alone; full credentials optional. |
| Shared rate limiter | `lib/natlas-rate-limit.ts` | Firestore-backed (20 requests / 10 min per learner, configurable). Falls back to per-instance memory when no service account is configured. UIDs are SHA-256 hashed before storage. Chat + transcription share the quota. |
| Tutor UI | `components/climate-tutor/ClimateTutor.tsx` | Accessible chat component (aria-live, labelled controls), English/Hausa/Igbo/Yoruba selector, voice notes (mic → N-ATLAS ASR, with the browser's Web Speech API as automatic fallback while N-ATLAS is unconfigured), loading/error/fallback states. Renders model output as plain text only. |
| Dashboard mount | `app/(user)/dashboard/page.tsx` | Tutor section rendered at the bottom of the student dashboard. |
| Dependency | `firebase-admin` | Server-side token verification + Firestore rate limiting. |

The existing Gemini chatbot (`components/chatbot/Chatbot.tsx` → `/api/chat-ai`) is
untouched; decide later whether to retire or migrate it once the N-ATLAS tutor is live.

## Request flow

1. Learner types a question in the tutor on the dashboard.
2. Client fetches a fresh Firebase ID token and POSTs
   `Authorization: Bearer <idToken>` + `{ message, language }` to `/api/natlas-chat`.
3. Route: origin check (optional) → session verification → payload validation
   (≤ 4,000 chars, language in `en|ha|ig|yo`) → rate limit → upstream call.
4. Upstream: `POST {NATLAS_BASE_URL}/v1/chat/completions` with Bearer key, model
   `NCAIR1/N-ATLaS`, controlled system prompt, temperature 0.4, max_tokens 700,
   45 s timeout.
5. Only the answer text and model ID return to the browser. No prompts, keys or
   upstream headers are logged.

## Environment variables (server-side only — never `NEXT_PUBLIC_`)

| Variable | Value | Where |
| --- | --- | --- |
| `NATLAS_BASE_URL` | `https://kambah123--natlas-serve-natlasservice-serve.modal.run` | `.env.local` + Vercel |
| `NATLAS_API_KEY` | *(get from NAIC/ONDI — none is issued yet)* | `.env.local` + Vercel |
| `NATLAS_MODEL` | `NCAIR1/N-ATLaS` | optional (this is the default) |
| `SHARA_ALLOWED_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` locally; production URL in Vercel | optional extra browser control; comma-separated list supported |
| `FIREBASE_PROJECT_ID` | `shara-climate-ad59c` | optional; falls back to `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON (single line) | optional; enables shared Firestore rate limiting |
| `NATLAS_RATE_LIMIT_MAX` / `NATLAS_RATE_LIMIT_WINDOW_MINUTES` | `20` / `10` | optional tuning |

Local placeholders were appended to `.env.local` (untracked). Add the same values in
**Vercel → Project Settings → Environment Variables** (Preview + Production) and
redeploy. Do **not** put them in `.env.production` — that file is tracked in git.

## Before production release (guide §6 blockers)

1. **Obtain authorised access** — request the API key and written usage terms from the
   NAIC/ONDI programme (Phase 0 in guide §13). The demo gateway URL is the documented
   host but its availability must be confirmed; from the dev machine on 10 Oct 2026
   `GET /health` did **not** respond (90 s timeout), so treat reachability as unconfirmed.
2. **Set `FIREBASE_SERVICE_ACCOUNT`** in Vercel so the rate limiter is shared across
   instances instead of per-instance memory.
3. **Confirm the upstream schema** against the authorised documentation
   (https://natlas-docs.vercel.app — `POST /v1/chat/completions`, model `NCAIR1/N-ATLaS`).
4. Optionally configure a Firestore TTL policy on `natlasRateLimits.windowStart` to
   auto-expire limiter documents.

## Test results (10 Oct 2026, local `next dev`)

| Test (guide §10) | Expected | Result |
| --- | --- | --- |
| Wrong method (GET) | HTTP 405 | ✅ 405 |
| POST without session | Blocked | ✅ 401 |
| POST with invalid token | Blocked, no key/secret leaks | ✅ 401 |
| Invalid JSON body | Safe rejection | ✅ 401 (auth runs first by design) |
| Empty/oversized message | HTTP 400 | Implemented (auth required first) — re-test with a real session |
| Unsupported language | HTTP 400 | Implemented (auth required first) — re-test with a real session |
| Missing configuration | Safe HTTP 503 | Implemented — re-test with a real session |
| Authenticated inference | Non-empty answer | ⏳ Blocked on authorised API key |
| Health/reachability | Endpoint responds | ⚠️ `/health` unreachable from dev machine on test day |

### Re-run after receiving credentials

```bash
npm run dev
# 405:
curl -i -X GET http://localhost:3000/api/natlas-chat
# 401:
curl -i -X POST http://localhost:3000/api/natlas-chat -H "Content-Type: application/json" -d '{"message":"hi"}'
# Full inference (use a real ID token from a signed-in learner session):
curl -i -X POST http://localhost:3000/api/natlas-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -d '{"message":"What is climate change?","language":"en"}'
```

## Architecture update (10 Oct 2026): self-hosted model, no third-party key

The programme team confirmed no hosted API key will be issued — the model is
downloaded and served by us. This laptop cannot run the model locally
(N-ATLaS is a Llama-3 8B, ~15 GiB BF16, needs a 24 GB GPU; this machine is an
i5-6300U / Intel HD Graphics / 3.6 GB RAM), so we use the kit's supported
cloud path:

- **Modal Starter plan** (free $30/month compute, scales to zero) runs
  `serve/modal_app.py`: vLLM serving `NCAIR1/N-ATLaS` + Whisper ASR (CPU) +
  the authenticated gateway, on one GPU, behind one base URL.
- The five NCAIR1 Hugging Face repos are gated but auto-approve; the HF token
  lives only in the Modal secret `natlas-hf` and the kit's git-ignored `.env`.
- The gateway key (`NATLAS_API_KEYS`) is **generated by us**
  (`openssl rand -hex 32`) — this is the `NATLAS_API_KEY` the academy sends.
  No third party ever holds it.
- Repo cloned to `C:\Users\User\Desktop\N-ATLAS-Kit`; Modal CLI 1.6.1 installed.
- After `modal deploy`, `NATLAS_BASE_URL` in `.env.local` (and Vercel) points
  at our `*.modal.run` URL instead of the unreachable demo host.

User steps and the automated deploy sequence: see `docs/natlas-your-steps.md`.
Licence: attribution mandatory, 1,000 active users / rolling 30 days,
commercial use needs a separate Awarri agreement.

## Voice notes (preview)

The tutor records voice notes with `MediaRecorder` (webm/opus) and sends them to
`/api/natlas-transcribe`, which forwards to the gateway's OpenAI-compatible
`POST /v1/audio/transcriptions`. The selected UI language picks the ASR model
(`NCAIR1/Hausa-ASR`, `Igbo-ASR`, `Yoruba-ASR` or `NigerianAccentedEnglish`).
The transcript lands in the input box so the learner reviews it before sending.
Recordings are capped at 60 s client-side; the gateway itself splits longer audio
and caps uploads at 12 MB server-side.

While `NATLAS_API_KEY` is unset, the route returns 503 and the component
automatically falls back to the browser's Web Speech API (`SpeechRecognition`,
Chrome/Edge; `ha-NG`/`ig-NG`/`yo-NG`/`en-NG` where supported). This fallback runs
in the learner's browser, is clearly announced in the UI, and stops being used
once the N-ATLAS key is configured. Per guide §12, voice is labelled *preview*
and must not be advertised as N-ATLAS-powered until a real end-to-end
transcription is verified with the authorised key.

## NAIC evidence pack hooks (guide §14)

- Commit hash of this integration: see `git log` for the N-ATLAS commit.
- Only claim integration after a successful traceable inference (test above) — do not
  count this code as evidence on its own.
- Capture: redacted request/response, model ID, deployment URL + timestamp, demo video
  of a learner question and answer on the dashboard.
