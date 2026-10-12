# Your 2 steps to switch the AI Tutor to our own N-ATLAS model

The programme team confirmed: no third-party API key — we download the model and
run it ourselves. Since this laptop can't run a 24 GB-GPU model, the kit's
supported path is **Modal** (free Starter plan, $30/month compute credit): the
model weights download to Modal's cloud GPU, controlled from this laptop.

Everything on the code side is DONE. Only two account steps need **you**
(accounts can't be created by the agent). Budget ~30 minutes.

## Step 1 — Hugging Face access (the model licence) — ~10 min

1. Create/log in at https://huggingface.co/join
2. Open each of these five pages while logged in and click the agree button
   ("You need to agree to share your contact information…"). All five are
   **auto-approve**, so access is instant — but you must not miss any one:
   - https://huggingface.co/NCAIR1/N-ATLaS  (the chat model)
   - https://huggingface.co/NCAIR1/Hausa-ASR
   - https://huggingface.co/NCAIR1/Igbo-ASR
   - https://huggingface.co/NCAIR1/Yoruba-ASR
   - https://huggingface.co/NCAIR1/NigerianAccentedEnglish
3. Create a **Read** token at https://huggingface.co/settings/tokens
   (it looks like `hf_xxxxx…`, shown once — copy it).
4. Open `C:\Users\User\Desktop\N-ATLAS-Kit\.env` and replace
   `PASTE_YOUR_HF_TOKEN_HERE` with the token.

## Step 2 — Modal account + payment method — ~10 min

1. Sign up at https://modal.com/signup (GitHub or Google login).
2. **Add a payment method** at https://modal.com/settings/billing — Modal
   requires a valid card before any GPU can be scheduled, even on the free
   plan. From Nigeria, the kit's own docs suggest (in order of ease):
   - a **dollar virtual card** from Chipper Cash / Grey / Geegpay / Cleva
     (fund ~$5 — enough for the card check),
   - a domiciliary-account card with international transactions enabled,
   - a teammate's card (Starter plan allows 3 seats).
   The $30/month free credit comfortably covers our usage (the kit estimates
   ~$2.20 for a full dev day; it scales to zero between requests).

## Then tell the agent "done" — the rest is automated

Already prepared on this machine:
- N-ATLAS-Kit cloned to `C:\Users\User\Desktop\N-ATLAS-Kit`
- Modal CLI 1.6.1 installed (Python 3.14)
- Gateway API key generated and set on BOTH sides (kit `.env` and the
  academy's `.env.local`) — never committed to git

The agent will then run, in order:
1. `modal setup` (opens a browser — you just log in)
2. `modal secret create natlas-hf HF_TOKEN=<from kit .env>`
3. `modal run serve/modal_preflight.py --skip-gpu` (free check of HF access)
4. `modal run serve/modal_preflight.py` (real GPU check, < $0.05)
5. `modal secret create natlas-api NATLAS_API_KEYS=<generated key>`
6. `modal deploy serve/modal_app.py` → prints OUR gateway URL
7. Swap `NATLAS_BASE_URL` in the academy `.env.local` to that URL, restart,
   and run the full end-to-end tests (text chat + voice notes in all 4
   languages)

## Licence notes (from the kit's NOTICE)

- Attribution to the N-ATLAS/Awarri team is mandatory in the product.
- Cap: 1,000 active end-users per rolling 30 days (fine for beta).
- Commercial/enterprise deployment needs a separate agreement with Awarri —
  flag this with the NAIC programme before monetising the tutor.
