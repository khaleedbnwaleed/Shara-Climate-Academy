import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Completed-lesson store for the course player, dashboard and my-learning.
 *
 * Canonical key is `completed_lessons_{uid}_{courseId}` (used by the dashboard
 * and my-learning). The course player historically wrote
 * `completed_{uid}_{courseId}`; that key is kept in sync so existing learner
 * progress survives this change, and is migrated into the canonical key on
 * first read.
 */

const canonicalKey = (uid: string, courseId: string) =>
  `completed_lessons_${uid}_${courseId}`;
const legacyKey = (uid: string, courseId: string) =>
  `completed_${uid}_${courseId}`;

function parseList(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : null;
  } catch {
    return null;
  }
}

export function getCompletedLessons(uid: string, courseId: string): string[] {
  if (typeof window === 'undefined' || !uid) return [];
  const canonical = parseList(localStorage.getItem(canonicalKey(uid, courseId)));
  if (canonical) return canonical;

  const legacy = parseList(localStorage.getItem(legacyKey(uid, courseId)));
  if (legacy) {
    saveCompletedLessons(uid, courseId, legacy);
    return legacy;
  }
  return [];
}

export function saveCompletedLessons(uid: string, courseId: string, list: string[]): void {
  if (typeof window === 'undefined' || !uid) return;
  const serialized = JSON.stringify(list);
  localStorage.setItem(canonicalKey(uid, courseId), serialized);
  localStorage.setItem(legacyKey(uid, courseId), serialized);
}

/**
 * Merges the locally known completions with the learner's Firestore progress
 * document so progress follows the learner across devices. Firestore wins for
 * ids it knows about; the merged set is persisted before being returned.
 */
export async function syncCompletedLessonsFromFirestore(
  uid: string,
  courseId: string,
  localList: string[]
): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'courseProgress', courseId));
    if (!snap.exists()) return localList;
    const remote = parseList(JSON.stringify(snap.data()?.completedLessons ?? null)) || [];
    const merged = Array.from(new Set([...localList, ...remote]));
    if (merged.length !== localList.length) {
      saveCompletedLessons(uid, courseId, merged);
    }
    return merged;
  } catch {
    return localList;
  }
}

/** Upserts the Firestore progress document (best-effort; localStorage stays the fallback). */
export async function persistCompletedLessonsToFirestore(
  uid: string,
  courseId: string,
  list: string[]
): Promise<void> {
  try {
    const { doc, updateDoc, setDoc } = await import('firebase/firestore');
    const progressRef = doc(db, 'users', uid, 'courseProgress', courseId);
    try {
      await updateDoc(progressRef, { completedLessons: list, lastUpdated: new Date() });
    } catch {
      await setDoc(progressRef, { completedLessons: list, courseId, startedAt: new Date() });
    }
  } catch {
    // Non-fatal: local progress remains the source of truth.
  }
}
