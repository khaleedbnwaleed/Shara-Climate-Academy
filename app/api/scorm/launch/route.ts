import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import {
  authenticateScormRequest,
  getAdminFirestore,
  requireEnrolledScormCourse,
  ScormHttpError,
  scormCloudRequest,
  scormErrorResponse,
  serverTimestamp,
} from '@/lib/server/scorm-cloud'

export const runtime = 'nodejs'

type LaunchLinkResponse = {
  launchLink?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateScormRequest(request)
    const body = await request.json()
    const courseId = body?.courseId
    if (typeof courseId !== 'string') {
      throw new ScormHttpError('Course ID is required.', 400)
    }

    const { ref: courseRef, course } = await requireEnrolledScormCourse(user, courseId)
    const registrationRef = courseRef.collection('scormRegistrations').doc(user.uid)
    const db = getAdminFirestore()
    const now = Date.now()

    const registration = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(registrationRef)
      const current = snapshot.data()
      const registrationId =
        typeof current?.registrationId === 'string' ? current.registrationId : randomUUID()
      const learnerId =
        typeof current?.learnerId === 'string' ? current.learnerId : randomUUID()
      const registeringUntil =
        typeof current?.registeringUntil === 'number' ? current.registeringUntil : 0

      if (current?.registered === true) {
        return { registrationId, learnerId, shouldRegister: false }
      }
      if (registeringUntil > now) {
        throw new ScormHttpError('Your course is being prepared. Please try again shortly.', 409)
      }

      transaction.set(
        registrationRef,
        {
          learnerUid: user.uid,
          registrationId,
          learnerId,
          registered: false,
          registeringUntil: now + 60_000,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      return { registrationId, learnerId, shouldRegister: true }
    })

    if (registration.shouldRegister) {
      try {
        await scormCloudRequest<void>('/registrations', {
          method: 'POST',
          body: JSON.stringify({
            courseId: course.scormCloudCourseId,
            registrationId: registration.registrationId,
            learner: { id: registration.learnerId },
          }),
        })
        await registrationRef.set(
          {
            registered: true,
            registeringUntil: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      } catch (error) {
        await registrationRef.set(
          { registered: false, registeringUntil: 0, updatedAt: serverTimestamp() },
          { merge: true },
        )
        throw error
      }
    }

    const redirectUrl = 'message'
    const launchResponse = await scormCloudRequest<LaunchLinkResponse>(
      `/registrations/${encodeURIComponent(registration.registrationId)}/launchLink`,
      {
        method: 'POST',
        body: JSON.stringify({
          redirectOnExitUrl: redirectUrl,
          expiry: 300,
          tracking: true,
        }),
      },
    )

    if (
      !launchResponse.launchLink ||
      new URL(launchResponse.launchLink).origin !== 'https://cloud.scorm.com'
    ) {
      throw new ScormHttpError('SCORM Cloud returned an invalid launch link.', 502)
    }

    await registrationRef.set(
      { lastLaunchedAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true },
    )

    return Response.json({ launchLink: launchResponse.launchLink })
  } catch (error) {
    return scormErrorResponse(error)
  }
}
