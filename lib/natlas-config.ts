// Shared configuration and messages for the N-ATLAS routes (chat + transcription).

// Setup guidance is for the developer in dev; learners only see a safe message.
export const notConfiguredMessage =
  process.env.NODE_ENV === 'development'
    ? 'The AI tutor is not configured yet. Set NATLAS_BASE_URL and NATLAS_API_KEY in .env.local (see docs/natlas-integration.md), then restart the dev server.'
    : 'The AI tutor is temporarily unavailable. Please try again later.';

/**
 * The gateway base URL only ever comes from server-side environment variables,
 * never from the browser. Accepts the origin with or without a trailing /v1.
 */
export function resolveNatlasBaseURL(): string {
  return (process.env.NATLAS_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v1$/, '');
}

export function natlasApiKey(): string | undefined {
  return process.env.NATLAS_API_KEY || undefined;
}

export function natlasModel(): string {
  return process.env.NATLAS_MODEL || 'NCAIR1/N-ATLaS';
}
