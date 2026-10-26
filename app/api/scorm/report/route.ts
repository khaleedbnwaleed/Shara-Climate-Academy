import { NextRequest } from 'next/server'
import {
  authenticateScormRequest,
  getAdminFirestore,
  requireInstructorCourse,
  ScormHttpError,
  scormCloudRequest,
  scormErrorResponse,
  scorePercent,
  serverTimestamp,
} from '@/lib/server/scorm-cloud'

export const runtime = 'nodejs'

type RegistrationProgress = {
  registrationCompletion?: string
  registrationCompletionAmount?: number
  registrationSuccess?: string
  score?: { scaled?: number }
  totalSecondsTracked?: number
  updated?: string
  completedDate?: string
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateScormRequest(request)
    const courseId = request.nextUrl.searchParams.get('courseId')
    if (!courseId) throw new ScormHttpError('Course ID is required.', 400)

    const { ref: courseRef } = await requireInstructorCourse(user, courseId)
    const db = getAdminFirestore()
    const registrationsSnapshot = await courseRef
      .collection('scormRegistrations')
      .where('registered', '==', true)
      .limit(100)
      .get()

    const rows = await Promise.all(
      registrationsSnapshot.docs.map(async (registrationDoc) => {
        const registration = registrationDoc.data()
        if (
          typeof registration.registrationId !== 'string' ||
          typeof registration.learnerUid !== 'string'
        ) {
          throw new ScormHttpError('A learner registration record is invalid.', 500)
        }
        const [progress, learnerSnapshot] = await Promise.all([
          scormCloudRequest<RegistrationProgress>(
            `/registrations/${encodeURIComponent(registration.registrationId)}`,
          ),
          db.collection('users').doc(registration.learnerUid).get(),
        ])

        const normalized = {
          completion: progress.registrationCompletion || 'UNKNOWN',
          completionAmount:
            typeof progress.registrationCompletionAmount === 'number'
              ? progress.registrationCompletionAmount
              : null,
          success: progress.registrationSuccess || 'UNKNOWN',
          score: scorePercent(progress.score?.scaled),
          totalSecondsTracked:
            typeof progress.totalSecondsTracked === 'number' ? progress.totalSecondsTracked : 0,
          updated: progress.updated || null,
          completedDate: progress.completedDate || null,
        }

        await registrationDoc.ref.set(
          { progress: normalized, lastProgressSyncAt: serverTimestamp() },
          { merge: true },
        )

        const learnerName = learnerSnapshot.get('name')
        return {
          learner: typeof learnerName === 'string' && learnerName ? learnerName : 'Learner',
          completion: normalized.completion,
          success: normalized.success,
          score: normalized.score,
          totalSecondsTracked: normalized.totalSecondsTracked,
          updated: normalized.updated,
        }
      }),
    )

    return Response.json({ registrations: rows })
  } catch (error) {
    return scormErrorResponse(error)
  }
}
