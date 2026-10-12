import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

const ADMIN_APP_NAME = 'shara-server';

/**
 * Server-side Firebase app used to verify learner ID tokens.
 *
 * With FIREBASE_SERVICE_ACCOUNT set (JSON string) the full Admin SDK is
 * available. Without it, the SDK is initialized with the project ID only,
 * which is sufficient for ID-token verification: Google's public signing
 * certificates are fetched without credentials. Operations that require
 * credentials (custom tokens, Firestore access, revocation checks) are not
 * supported on that path.
 */
export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'Set FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) so learner sessions can be verified.'
    );
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    let credential;
    try {
      credential = cert(JSON.parse(serviceAccountJson));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    }
    return initializeApp({ credential, projectId }, ADMIN_APP_NAME);
  }

  return initializeApp({ projectId }, ADMIN_APP_NAME);
}

export function hasAdminCredentials(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

/**
 * True when the server has everything it needs to verify learner sessions.
 * Detects a malformed FIREBASE_SERVICE_ACCOUNT early so the route can return
 * a safe 503 instead of an ambiguous auth failure.
 */
export function isAuthConfigured(): boolean {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) return true;
  try {
    JSON.parse(serviceAccountJson);
    return true;
  } catch {
    return false;
  }
}

/** Verifies a Firebase ID token from the Authorization header. No revocation check is performed because that requires service-account credentials; tokens still expire after one hour. */
export async function verifyLearnerToken(idToken: string): Promise<DecodedIdToken> {
  const app = getAdminApp();
  return getAuth(app).verifyIdToken(idToken);
}
