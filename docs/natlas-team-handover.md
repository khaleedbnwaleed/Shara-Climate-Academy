# N-ATLAS AI Climate Tutor — Team Handover

**Status:** the integration is code-complete and committed. The ONLY remaining
step is deploying the N-ATLAS model (the "download") and pasting two values
into environment settings. This guide is self-contained: follow it top to
bottom on any machine with ~10 GB free disk, Python 3.10+ and Git. No prior
context needed.

---

## What is already built (do not rebuild)

Shara Climate Academy (this repo, Next.js 15) has an AI Climate Tutor on the
student dashboard — text chat + voice notes in English, Hausa, Igbo and
Yoruba — powered by Nigeria's N-ATLAS model:

| Piece | Where | What it does |
| --- | --- | --- |
| Chat API | `app/api/natlas-chat/route.ts` | Verifies the learner's Firebase session, validates input (4,000 chars max, 4 languages), rate-limits, calls N-ATLAS chat completions, returns the answer |
| Voice API | `app/api/natlas-transcribe/route.ts` | Same protections; sends recorded audio to N-ATLAS transcription, returns the text |
| Tutor UI | `components/climate-tutor/ClimateTutor.tsx` | Mic + chat box on `/dashboard`; while N-ATLAS is unconfigured, voice automatically uses the browser's speech recognition (preview) |
| Rate limiter | `lib/natlas-rate-limit.ts` | 20 requests / 10 min per learner (Firestore-backed when `FIREBASE_SERVICE_ACCOUNT` is set; per-instance otherwise) |
| Config | `lib/natlas-config.ts` + `.env.local` | Base URL / key resolution; no secrets in code |

Full technical detail: `docs/natlas-integration.md`.

## Why a deploy is needed at all

There is **no public hosted N-ATLAS API**. The programme team confirmed we
run the model ourselves ("download the model, no API key from them"). The
model is an 8B-parameter LLM needing a 24 GB GPU, so it cannot run on office
laptops — the kit's supported path is a free **Modal** account where the
weights download to Modal's cloud GPU and we get our own gateway URL + our
own self-generated API key.

## Your steps (the only remaining work)

### Step 1 — Accept the model licences on Hugging Face (~10 min)

1. Log in / create an account at https://huggingface.co
2. Open each of the five pages below and click the agree button
   (auto-approved, instant — but ALL five are required):
   - https://huggingface.co/NCAIR1/N-ATLaS (chat model)
   - https://huggingface.co/NCAIR1/Hausa-ASR
   - https://huggingface.co/NCAIR1/Igbo-ASR
   - https://huggingface.co/NCAIR1/Yoruba-ASR
   - https://huggingface.co/NCAIR1/NigerianAccentedEnglish
3. Create a **Read** token at https://huggingface.co/settings/tokens
   (`hf_xxx…`, shown once — copy it).

### Step 2 — Create the Modal account (~10 min)

1. Sign up at https://modal.com/signup (GitHub or Google login).
   The free Starter plan includes **$30/month of compute** — the kit
   estimates ~$2.20 for a full dev day since it scales to zero between
   requests.
2. **Add a payment card** at https://modal.com/settings/billing — required
   for GPU scheduling even on the free plan. From Nigeria the kit docs
   recommend: a dollar virtual card (Chipper Cash / Grey / Geegpay / Cleva,
   funded ~$5), a domiciliary-account card, or a teammate's card.

### Step 3 — Deploy (commands; ~15 min + image build time)

```bash
# 1. Get the kit
git clone https://github.com/Kambah123/N-ATLAS-Kit.git
cd N-ATLAS-Kit
cp .env.example .env

# 2. Put your HF token in .env:  HF_TOKEN=hf_xxxxxxxx

# 3. Install + authenticate the Modal CLI (opens a browser to log in)
pip install modal
modal setup

# 4. Give Modal your HF token (exact name matters)
modal secret create natlas-hf HF_TOKEN=hf_xxxxxxxx

# 5. Verify everything works BEFORE the real deploy (costs < $0.05)
modal run serve/modal_preflight.py --skip-gpu   # free check of HF access
modal run serve/modal_preflight.py               # real GPU check — must print READY

# 6. Generate OUR OWN API key and store it in Modal (keep a copy!)
openssl rand -hex 32
modal secret create natlas-api NATLAS_API_KEYS=<paste-the-generated-key>

# 7. Deploy. Prints a URL like https://<workspace>--natlas-serve-natlasservice-serve.modal.run
modal deploy serve/modal_app.py
```

Troubleshooting table for the preflight lives in `serve/MODAL_SETUP.md`
inside the kit. A 401 at startup = one of the five HF pages wasn't accepted.

### Step 4 — Connect the academy (2 values, 2 places)

Generate the key ONCE in step 3.6 and use the same value in both places:

**Local development** — in `Shara-Climate-Academy/.env.local` (git-ignored;
copy from `.env.local.example` if starting fresh):

```
NATLAS_BASE_URL=https://<workspace>--natlas-serve-natlasservice-serve.modal.run
NATLAS_API_KEY=<the key you generated>
NATLAS_MODEL=NCAIR1/N-ATLaS
SHARA_ALLOWED_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

**Production (Vercel)** — Project → Settings → Environment Variables, add the
same `NATLAS_BASE_URL` and `NATLAS_API_KEY` (plus the production origin for
`SHARA_ALLOWED_ORIGIN`), then redeploy. Also recommended: `FIREBASE_SERVICE_ACCOUNT`
(service-account JSON on one line) so the rate limiter is shared across
instances.

Then restart the dev server / redeloy and ask the tutor a question on
`/dashboard`.

### Step 5 — Acceptance tests (also = NAIC evidence)

| Test | Command / action | Expected |
| --- | --- | --- |
| Gateway health | `curl <base-url>/health` | 200 (no key needed) |
| Wrong method | `curl -i -X GET localhost:3000/api/natlas-chat` | 405 |
| No session | `curl -i -X POST localhost:3000/api/natlas-chat -H "Content-Type: application/json" -d '{"message":"hi"}'` | 401 |
| Real chat | Ask in the tutor UI signed in | Answer appears; save redacted request/response + timestamp |
| Real voice | Record a note in each of en/ha/ig/yo | Transcript lands in the input; reviewed by proficient speakers |

**Cold starts are normal:** the gateway scales to zero; the first request
after idle may return 504 "still waking up" while ~15 GB of weights reload
(30–90 s). Retry, or warm it first: `curl <base-url>/health` then wait a
minute. For a judged demo only, the kit supports `min_containers=1` — turn it
off afterwards (it burns the free credit at ~$26/day).

**Evidence for the NAIC pack:** deployment URL + timestamped real response,
model ID `NCAIR1/N-ATLaS`, commit hash, redacted test outputs, demo video.
Do not claim N-ATLAS integration until the "Real chat" test above passes.

## Licence obligations (from the kit's NOTICE)

- Attribution to the N-ATLAS / Awarri team is **mandatory** in the product.
- Cap of **1,000 active end-users per rolling 30 days** — fine for beta.
- Commercial/enterprise deployment requires a separate agreement with Awarri
  — clear it with the NAIC programme before monetising the tutor.

## Security rules (already enforced by the code — keep it that way)

- `NATLAS_API_KEY` is server-side only. Never prefix any N-ATLAS variable
  with `NEXT_PUBLIC_`, never put it in `.env.production` (that file is
  tracked in git), never log it.
- The HF token lives only in the kit's git-ignored `.env` and the Modal
  secret `natlas-hf`.
- Model output is rendered as plain text — do not introduce
  `dangerouslySetInnerHTML` for it.
