import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  where,
  query,
} from 'firebase/firestore';

export interface CourseLesson {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'pdf' | 'document' | 'text' | 'image';
  /** External URL: YouTube link/embed, or file download URL. */
  url: string;
  /** Inline text content for text lessons. */
  content: string;
  order: number;
  /** Where the lesson was read from. */
  source: 'root' | 'legacy';
}

type RawLesson = Record<string, unknown>;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : 0;

/**
 * Fetch lessons from the canonical root collection and the legacy
 * course subcollection, then merge and deduplicate the results.
 */
export async function fetchCourseLessons(
  courseId: string
): Promise<CourseLesson[]> {
  const [root, legacy] = await Promise.all([
    fetchRootLessons(courseId).catch(() => [] as CourseLesson[]),
    fetchLegacySubcollectionLessons(courseId).catch(
      () => [] as CourseLesson[]
    ),
  ]);

  if (root.length === 0) return legacy;
  if (legacy.length === 0) return root;

  const seen = new Set(root.map(normalizeKey));
  const extras = legacy.filter(
    (lesson) => !seen.has(normalizeKey(lesson))
  );

  return [...root, ...extras];
}

async function fetchRootLessons(
  courseId: string
): Promise<CourseLesson[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'lessons'),
      where('courseId', '==', courseId)
    )
  );

  const lessons: CourseLesson[] = snapshot.docs.map(
    (docSnap, index) => {
      const data = docSnap.data() as RawLesson;

      return {
        id: docSnap.id,
        title: asString(data.title) || 'Untitled Lesson',
        duration: asNumber(data.duration),
        type: (asString(data.type) || 'video') as CourseLesson['type'],
        url: asString(data.content) || asString(data.url),
        content: asString(data.content),
        order:
          data.order === undefined
            ? index + 1
            : asNumber(data.order),
        source: 'root' as const,
      };
    }
  );

  return lessons.sort((a, b) => a.order - b.order);
}

async function fetchLegacySubcollectionLessons(
  courseId: string
): Promise<CourseLesson[]> {
  const snapshot = await getDocs(
    collection(db, 'courses', courseId, 'lessons')
  );

  const lessons: CourseLesson[] = snapshot.docs.map(
    (docSnap, index) => {
      const data = docSnap.data() as RawLesson;

      return {
        id: docSnap.id,
        title: asString(data.title) || 'Untitled Lesson',
        duration: asNumber(data.duration),
        type: (asString(data.type) || 'video') as CourseLesson['type'],
        url: asString(data.url) || asString(data.content),
        content: asString(data.content),
        order:
          data.order === undefined
            ? 1_000_000 + index
            : asNumber(data.order),
        source: 'legacy' as const,
      };
    }
  );

  return lessons.sort((a, b) => a.order - b.order);
}

function normalizeKey(lesson: CourseLesson): string {
  return `${lesson.type}:${lesson.url || lesson.title}`.toLowerCase();
}
