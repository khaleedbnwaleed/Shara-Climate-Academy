import crypto from 'node:crypto';
import { getAdminApp, hasAdminCredentials } from './firebase-admin';

/**
 * Shared per-learner rate limit for the N-ATLAS tutor.
 *
 * When FIREBASE_SERVICE_ACCOUNT is configured, counters live in Firestore and
 * are shared across all serverless instances. Without it the limiter falls
 * back to per-instance memory, which is weaker on serverless platforms but
 * still blocks bursts from a single warm instance. Configure the service
 * account in production (see docs/natlas-integration.md).
 */

const WINDOW_MS =
  (Number(process.env.NATLAS_RATE_LIMIT_WINDOW_MINUTES) || 10) * 60 * 1000;
const MAX_REQUESTS = Number(process.env.NATLAS_RATE_LIMIT_MAX) || 20;

const COLLECTION = 'natlasRateLimits';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** UIDs are hashed before storage so the limiter holds no direct identifiers. */
export function hashLearnerUid(uid: string): string {
  return crypto.createHash('sha256').update(uid).digest('hex').slice(0, 32);
}

export async function checkRateLimit(uidHash: string): Promise<RateLimitResult> {
  if (hasAdminCredentials()) {
    try {
      return await firestoreCheck(uidHash);
    } catch (error) {
      console.error(
        'Shared rate limit store unavailable, using in-process fallback:',
        error instanceof Error ? error.name : 'UnknownError'
      );
    }
  }
  return memoryCheck(uidHash);
}

async function firestoreCheck(uidHash: string): Promise<RateLimitResult> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore(getAdminApp());
  const ref = db.collection(COLLECTION).doc(uidHash);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { windowStart?: number; count?: number } | undefined;

    if (!snap.exists || !data) {
      tx.set(ref, { windowStart: now, count: 1 });
      return { allowed: true } as RateLimitResult;
    }

    const windowStart = data.windowStart ?? 0;
    const count = data.count ?? 0;

    if (now - windowStart >= WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return { allowed: true } as RateLimitResult;
    }

    if (count >= MAX_REQUESTS) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((windowStart + WINDOW_MS - now) / 1000)),
      } as RateLimitResult;
    }

    tx.update(ref, { count: count + 1 });
    return { allowed: true } as RateLimitResult;
  });
}

const memoryStore = new Map<string, { windowStart: number; count: number }>();

function memoryCheck(uidHash: string): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so the map cannot grow without bound.
  if (memoryStore.size > 1000) {
    for (const [key, entry] of memoryStore) {
      if (now - entry.windowStart >= WINDOW_MS) memoryStore.delete(key);
    }
  }

  const entry = memoryStore.get(uidHash);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    memoryStore.set(uidHash, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
