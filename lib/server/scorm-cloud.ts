import { randomUUID } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import type { NextRequest } from 'next/server'

const SCORM_API_URL = 'https://cloud.scorm.com/api/v2'

export class ScormHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ScormHttpError'
  }
}

export type AuthenticatedUser = {
  uid: string
  role: string
  name: string
  email?: string
  approved?: boolean
}

export type ScormCourse = {
  id: string
  title?: string
  instructorName?: string
  instructorUid?: string
  scormCloudCourseId?: string
  scormImportJobId?: string
  scormImportStatus?: string
  scormEnabled?: boolean
  [key: string]: unknown
}

export function getAdminApp() {
  const encodedAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64
  if (!encodedAccount) {
    throw new ScormHttpError('SCORM integration is not configured on the server.', 503)
  }

  const appName = 'shara-scorm-admin'
  let app = getApps().find((registeredApp) => registeredApp.name === appName)

  if (!app) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(encodedAccount, 'base64').toString('utf8'),
      )
      app = initializeApp(
        {
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        appName,
      )
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error)
      throw new ScormHttpError('Server authentication is not configured correctly.', 503)
    }
  }

  return app
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp())
}

export async function authenticateScormRequest(
  request: NextRequest,
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new ScormHttpError('Sign in is required.', 401)

  try {
    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(token, true)
    const userSnapshot = await getAdminFirestore().collection('users').doc(decodedToken.uid).get()
    if (!userSnapshot.exists) throw new ScormHttpError('User profile was not found.', 403)

    const data = userSnapshot.data()!
    if (data.status === 'inactive' || data.status === 'disabled') {
      throw new ScormHttpError('This account is not active.', 403)
    }

    return {
      uid: decodedToken.uid,
      role: typeof data.role === 'string' ? data.role : '',
      name: typeof data.name === 'string' ? data.name : '',
      email: typeof data.email === 'string' ? data.email : undefined,
      approved: data.approved === true,
    }
  } catch (error) {
    if (error instanceof ScormHttpError) throw error
    console.error('Firebase token verification failed:', error)
    throw new ScormHttpError('Your session could not be verified. Please sign in again.', 401)
  }
}

export function requireInstructor(user: AuthenticatedUser) {
  const isInstructor = user.role === 'lecturer' || user.role === 'professional'
  if (!isInstructor || (user.role === 'professional' && !user.approved)) {
    throw new ScormHttpError('Instructor access is required.', 403)
  }
}

export function requireLearner(user: AuthenticatedUser) {
  if (user.role !== 'student' && user.role !== 'professional') {
    throw new ScormHttpError('Learner access is required.', 403)
  }
}

export async function getScormCourse(courseId: string): Promise<{
  ref: FirebaseFirestore.DocumentReference
  course: ScormCourse
}> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(courseId)) {
    throw new ScormHttpError('Invalid course identifier.', 400)
  }

  const db = getAdminFirestore()
  const ref = db.collection('courses').doc(courseId)
  const snapshot = await ref.get()
  if (!snapshot.exists) throw new ScormHttpError('Course was not found.', 404)

  return { ref, course: { id: snapshot.id, ...snapshot.data() } as ScormCourse }
}

export async function requireInstructorCourse(
  user: AuthenticatedUser,
  courseId: string,
) {
  requireInstructor(user)
  const result = await getScormCourse(courseId)
  const { ref, course } = result

  if (course.instructorUid === user.uid) return result
  if (course.instructorUid) {
    throw new ScormHttpError('You do not manage this course.', 403)
  }

  // Older academy courses recorded an instructor name rather than an owner ID.
  if (!user.name || course.instructorName !== user.name) {
    throw new ScormHttpError('You do not manage this course.', 403)
  }

  const nameMatches = await getAdminFirestore()
    .collection('users')
    .where('name', '==', user.name)
    .get()
  const instructorMatches = nameMatches.docs.filter((candidate) =>
    ['lecturer', 'professional'].includes(candidate.get('role')),
  )
  if (instructorMatches.length !== 1 || instructorMatches[0].id !== user.uid) {
    throw new ScormHttpError(
      'Course ownership needs to be confirmed by an administrator before SCORM content can be managed.',
      403,
    )
  }

  await ref.update({ instructorUid: user.uid })
  return { ref, course: { ...course, instructorUid: user.uid } }
}

export async function requireEnrolledScormCourse(
  user: AuthenticatedUser,
  courseId: string,
) {
  requireLearner(user)
  const result = await getScormCourse(courseId)
  const userSnapshot = await getAdminFirestore().collection('users').doc(user.uid).get()
  const enrolledCourses = userSnapshot.get('enrolledCourses')
  if (!Array.isArray(enrolledCourses) || !enrolledCourses.includes(courseId)) {
    throw new ScormHttpError('You must be enrolled to access this SCORM course.', 403)
  }
  if (
    !result.course.scormEnabled ||
    result.course.scormImportStatus !== 'COMPLETE' ||
    typeof result.course.scormCloudCourseId !== 'string'
  ) {
    throw new ScormHttpError('This course does not have a ready SCORM package.', 409)
  }
  return result
}

function getScormCredentials() {
  const appId = process.env.SCORM_CLOUD_APP_ID
  const secretKey = process.env.SCORM_CLOUD_SECRET_KEY
  if (!appId || !secretKey) {
    throw new ScormHttpError('SCORM Cloud credentials are not configured.', 503)
  }
  return `Basic ${Buffer.from(`${appId}:${secretKey}`).toString('base64')}`
}

export async function scormCloudRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', getScormCredentials())
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${SCORM_API_URL}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    })
  } catch (error) {
    console.error('SCORM Cloud request failed:', error)
    throw new ScormHttpError('Could not connect to SCORM Cloud. Please try again.', 502)
  }

  if (!response.ok) {
    const detail = await response.text()
    console.error('SCORM Cloud API error:', response.status, detail.slice(0, 1000))
    throw new ScormHttpError(
      'SCORM Cloud could not complete the request. Check the integration settings and try again.',
      502,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getScormPackageHostAllowlist() {
  return (process.env.SCORM_ALLOWED_PACKAGE_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

export function createRegistrationId() {
  return randomUUID()
}

export function serverTimestamp() {
  return FieldValue.serverTimestamp()
}

export function scormErrorResponse(error: unknown) {
  if (error instanceof ScormHttpError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('Unexpected SCORM integration error:', error)
  return Response.json(
    { error: 'The SCORM request failed. Please try again later.' },
    { status: 500 },
  )
}

export function scormCourseId(courseId: string) {
  return `shara-${courseId}`
}

export function scorePercent(scaled?: number) {
  if (typeof scaled !== 'number' || !Number.isFinite(scaled)) return null
  return Math.round(Math.max(0, Math.min(100, scaled)))
}
