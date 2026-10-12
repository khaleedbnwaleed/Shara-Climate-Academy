import { NextRequest, NextResponse } from 'next/server';
import { isAuthConfigured, verifyLearnerToken } from '@/lib/firebase-admin';
import { checkRateLimit, hashLearnerUid } from '@/lib/natlas-rate-limit';
import {
  natlasApiKey,
  notConfiguredMessage,
  resolveNatlasBaseURL,
} from '@/lib/natlas-config';

// Voice-note transcription via the N-ATLAS gateway's OpenAI-compatible
// endpoint POST /v1/audio/transcriptions (Whisper-based ASR models:
// NCAIR1/Hausa-ASR, Igbo-ASR, Yoruba-ASR, NigerianAccentedEnglish).
// The gateway resamples to 16 kHz mono and splits audio longer than the
// 30-second Whisper window, so longer notes are accepted.

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
// The gateway scales to zero; the first request after idle reloads model
// weights, so allow generous time while staying under maxDuration.
const UPSTREAM_TIMEOUT_MS = 55000;
const ALLOWED_LANGUAGES = new Set(['en', 'ha', 'ig', 'yo']);

function jsonError(status: number, error: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store', ...extraHeaders } }
  );
}

export async function POST(request: NextRequest) {
  // Origin check is an additional browser control, not authentication.
  const expectedOrigins = (process.env.SHARA_ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (expectedOrigins.length > 0) {
    const origin = request.headers.get('origin');
    if (origin && !expectedOrigins.includes(origin)) {
      return jsonError(403, 'Origin not allowed.');
    }
  }

  // 1. Verify the existing academy learner session.
  if (!isAuthConfigured()) {
    return jsonError(503, notConfiguredMessage);
  }

  const authHeader = request.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return jsonError(401, 'Please sign in to use the AI tutor.');
  }

  let uid: string;
  try {
    const decoded = await verifyLearnerToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error(
      'Learner token verification failed:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return jsonError(401, 'Your session is invalid or has expired. Please sign in again.');
  }

  // 2. Validate the payload.
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_AUDIO_BYTES) {
    return jsonError(413, 'Voice note is too large. Please keep it under 12 MB.');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, 'Request body must be multipart form data with a voice note.');
  }

  const file = formData.get('file');
  const language = formData.get('language');

  if (!(file instanceof File) || file.size === 0) {
    return jsonError(400, 'No voice note was provided.');
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return jsonError(413, 'Voice note is too large. Please keep it under 12 MB.');
  }
  if (typeof language !== 'string' || !ALLOWED_LANGUAGES.has(language)) {
    return jsonError(400, 'Unsupported language.');
  }

  // 3. Rate-limit: transcription shares the tutor's per-learner quota.
  const limit = await checkRateLimit(hashLearnerUid(uid));
  if (!limit.allowed) {
    return jsonError(
      429,
      'You have sent a lot of questions in a short time. Please wait a few minutes and try again.',
      { 'Retry-After': String(limit.retryAfterSeconds) }
    );
  }

  // 4. Forward to the N-ATLAS gateway.
  const baseURL = resolveNatlasBaseURL();
  const apiKey = natlasApiKey();

  if (!baseURL || !apiKey) {
    return jsonError(503, notConfiguredMessage);
  }

  try {
    const upstreamForm = new FormData();
    const safeName = file.name || 'voice-note';
    upstreamForm.append('file', file, safeName);
    upstreamForm.append('language', language);

    const upstream = await fetch(`${baseURL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      // Log status only; do not log secrets, headers or learner audio.
      console.error('N-ATLAS transcription upstream status:', upstream.status);
      return jsonError(502, 'Speech service request failed.');
    }

    const data = (await upstream.json()) as { text?: unknown; model?: string };

    if (typeof data.text !== 'string' || !data.text.trim()) {
      return jsonError(502, 'Speech service returned no transcript.');
    }

    return NextResponse.json(
      { text: data.text.trim(), model: data.model },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('N-ATLAS transcription error type:', errorName);
    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      return jsonError(
        504,
        'The speech service is still waking up — the model server restarts after idle periods. Please try again in a moment.'
      );
    }
    return jsonError(502, 'Unable to reach the speech service.');
  }
}

// Explicit 405s for the acceptance tests; any other method is rejected by Next.js.
export async function GET() {
  return jsonError(405, 'Method not allowed.', { Allow: 'POST' });
}
