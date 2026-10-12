import { NextRequest, NextResponse } from 'next/server';
import { isAuthConfigured, verifyLearnerToken } from '@/lib/firebase-admin';
import { checkRateLimit, hashLearnerUid } from '@/lib/natlas-rate-limit';
import {
  natlasApiKey,
  natlasModel,
  notConfiguredMessage,
  resolveNatlasBaseURL,
} from '@/lib/natlas-config';

// Node runtime is required by firebase-admin. maxDuration must stay within the
// limits of the Vercel plan; the upstream timeout below is deliberately shorter.
export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `
You are Shara Climate Tutor, an educational assistant in Shara Climate Academy.
Explain climate change, adaptation, waste management, recycling, renewable energy,
biodiversity and environmental sustainability in clear, age-appropriate language.
Use Nigerian examples when relevant. Do not invent facts, sources or local emergency
information. State uncertainty and recommend qualified local support for consequential
decisions. Follow the learner's requested language when possible.
`.trim();

const LANGUAGES: Record<string, string> = {
  en: 'English',
  ha: 'Hausa',
  ig: 'Igbo',
  yo: 'Yoruba',
};

const MAX_MESSAGE_CHARS = 4000;
const MAX_BODY_BYTES = 32 * 1024;
const UPSTREAM_TIMEOUT_MS = 45000;

function jsonError(status: number, error: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store', ...extraHeaders } }
  );
}

export async function POST(request: NextRequest) {
  // Origin check is an additional browser control, not authentication.
  // Accepts multiple comma-separated origins, e.g. "http://localhost:3000,http://127.0.0.1:3000".
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
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, 'Request body is too large.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Request body must be JSON.');
  }

  const { message, language = 'en' } = (body ?? {}) as {
    message?: unknown;
    language?: unknown;
  };

  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_CHARS) {
    return jsonError(400, 'Enter a message of up to 4,000 characters.');
  }
  if (typeof language !== 'string' || !LANGUAGES[language]) {
    return jsonError(400, 'Unsupported language.');
  }

  // 3. Rate-limit before any upstream call. UIDs are hashed for storage.
  const limit = await checkRateLimit(hashLearnerUid(uid));
  if (!limit.allowed) {
    return jsonError(
      429,
      'You have sent a lot of questions in a short time. Please wait a few minutes and try again.',
      { 'Retry-After': String(limit.retryAfterSeconds) }
    );
  }

  // 4. Build the controlled upstream request. The base URL only ever comes
  // from server-side environment variables, never from the browser.
  const baseURL = resolveNatlasBaseURL();
  const apiKey = natlasApiKey();
  const model = natlasModel();

  if (!baseURL || !apiKey) {
    return jsonError(503, notConfiguredMessage);
  }

  try {
    const upstream = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Respond in ${LANGUAGES[language]}.\n\n${message.trim()}`,
          },
        ],
        // Accepted by the gateway for logging and passed to the model.
        language,
        temperature: 0.4,
        max_tokens: 700,
        stream: false,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      // Log status only; do not log secrets, headers or learner prompts.
      console.error('N-ATLAS upstream status:', upstream.status);
      return jsonError(502, 'AI service request failed.');
    }

    const data = (await upstream.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: unknown } }>;
    };

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      return jsonError(502, 'AI service returned no answer.');
    }

    return NextResponse.json(
      { answer: answer.trim(), model: data.model || model },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('N-ATLAS request error type:', errorName);
    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      return jsonError(
        504,
        'The AI tutor is still waking up — the model server restarts after idle periods. Please try again in a moment.'
      );
    }
    return jsonError(502, 'Unable to reach the AI tutor.');
  }
}

// Explicit 405s for the acceptance tests; any other method is rejected by Next.js.
export async function GET() {
  return jsonError(405, 'Method not allowed.', { Allow: 'POST' });
}
