import { NextRequest } from 'next/server'
import {
  authenticateScormRequest,
  getAdminFirestore,
  requireEnrolledScormCourse,
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

    const { ref: courseRef } = await requireEnrolledScormCourse(user, courseId)
    const registrationRef = courseRef.collection('scormRegistrations').doc(user.uid)
    const registrationSnapshot = await registrationRef.get()
    const registration = registrationSnapshot.data()

    if (!registration || registration.registered !== true) {
      return Response.json({ started: false, completion: 'NOT_STARTED', score: null })
    }
    if (typeof registration.registrationId !== 'string') {
      throw new ScormHttpError('The learner registration is invalid.', 500)
    }

    const progress = await scormCloudRequest<RegistrationProgress>(
      `/registrations/${encodeURIComponent(registration.registrationId)}`,
    )
    const normalized = {
      started: true,
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

    await registrationRef.set(
      { progress: normalized, lastProgressSyncAt: serverTimestamp() },
      { merge: true },
    )
    return Response.json(normalized)
  } catch (error) {
    return scormErrorResponse(error)
  }
}
