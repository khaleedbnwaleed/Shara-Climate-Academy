import { NextRequest } from 'next/server'
import {
  authenticateScormRequest,
  getScormPackageHostAllowlist,
  requireInstructorCourse,
  ScormHttpError,
  scormCloudRequest,
  scormCourseId,
  scormErrorResponse,
  serverTimestamp,
} from '@/lib/server/scorm-cloud'

export const runtime = 'nodejs'

const MAX_PACKAGE_BYTES = 4 * 1024 * 1024

type ImportJobResponse = {
  result?: string
}

type ImportStatusResponse = {
  jobId?: string
  status?: 'RUNNING' | 'COMPLETE' | 'ERROR'
  message?: string
  importResult?: {
    course?: { title?: string }
  }
}

function validatePackageUrl(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    throw new ScormHttpError('Choose a SCORM package ZIP or provide a hosted ZIP URL.', 400)
  }

  let packageUrl: URL
  try {
    packageUrl = new URL(value)
  } catch {
    throw new ScormHttpError('Enter a valid HTTPS URL for the hosted SCORM ZIP.', 400)
  }

  const allowedHosts = getScormPackageHostAllowlist()
  if (
    packageUrl.protocol !== 'https:' ||
    packageUrl.username ||
    packageUrl.password ||
    !allowedHosts.includes(packageUrl.hostname.toLowerCase())
  ) {
    throw new ScormHttpError(
      'Hosted package URLs must use HTTPS and a domain configured by the site administrator.',
      400,
    )
  }

  return packageUrl.toString()
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateScormRequest(request)
    const formData = await request.formData()
    const courseId = formData.get('courseId')
    if (typeof courseId !== 'string') {
      throw new ScormHttpError('Course ID is required.', 400)
    }

    const { ref, course } = await requireInstructorCourse(user, courseId)
    const cloudCourseId = scormCourseId(courseId)
    const file = formData.get('file')
    const packageUrl = formData.get('packageUrl')

    let job: ImportJobResponse
    if (file instanceof File) {
      if (!file.name.toLowerCase().endsWith('.zip') || file.size === 0) {
        throw new ScormHttpError('Select a non-empty SCORM .zip package.', 400)
      }
      if (file.size > MAX_PACKAGE_BYTES) {
        throw new ScormHttpError(
          'Direct uploads are limited to 4 MB on this deployment. Use an approved hosted ZIP URL for larger packages.',
          413,
        )
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new ScormHttpError('The selected file is not a valid ZIP package.', 400)
      }

      const cloudForm = new FormData()
      cloudForm.append(
        'file',
        new Blob([bytes], { type: 'application/zip' }),
        file.name.replace(/[^A-Za-z0-9._-]/g, '_'),
      )
      job = await scormCloudRequest<ImportJobResponse>(
        `/courses/importJobs/upload?courseId=${encodeURIComponent(cloudCourseId)}&mayCreateNewVersion=true`,
        { method: 'POST', body: cloudForm },
      )
    } else {
      const validatedUrl = validatePackageUrl(packageUrl)
      job = await scormCloudRequest<ImportJobResponse>(
        `/courses/importJobs?courseId=${encodeURIComponent(cloudCourseId)}&mayCreateNewVersion=true`,
        {
          method: 'POST',
          body: JSON.stringify({ url: validatedUrl }),
        },
      )
    }

    const jobId = job.result
    if (!jobId) throw new ScormHttpError('SCORM Cloud did not return an import job ID.', 502)

    await ref.update({
      scormCloudCourseId: cloudCourseId,
      scormImportJobId: jobId,
      scormImportStatus: 'RUNNING',
      scormImportStartedAt: serverTimestamp(),
      scormImportUpdatedAt: serverTimestamp(),
      scormEnabled: course.scormEnabled === true,
      scormImportError: null,
      ...(course.scormCourseTitle ? {} : { scormCourseTitle: null }),
    })

    return Response.json({ jobId, status: 'RUNNING' }, { status: 202 })
  } catch (error) {
    return scormErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateScormRequest(request)
    const courseId = request.nextUrl.searchParams.get('courseId')
    if (!courseId) throw new ScormHttpError('Course ID is required.', 400)

    const { ref, course } = await requireInstructorCourse(user, courseId)
    if (!course.scormImportJobId || !course.scormCloudCourseId) {
      throw new ScormHttpError('No SCORM import has been started for this course.', 404)
    }

    const status = await scormCloudRequest<ImportStatusResponse>(
      `/courses/importJobs/${encodeURIComponent(course.scormImportJobId)}`,
    )
    if (!status.status) throw new ScormHttpError('SCORM Cloud returned an invalid import status.', 502)

    await ref.update({
      scormImportStatus: status.status,
      scormImportUpdatedAt: serverTimestamp(),
      scormEnabled: status.status === 'COMPLETE' || course.scormEnabled === true,
      scormImportError: status.status === 'ERROR' ? status.message || 'Package import failed.' : null,
      ...(status.importResult?.course?.title
        ? { scormCourseTitle: status.importResult.course.title }
        : {}),
    })

    return Response.json({
      status: status.status,
      message: status.message || '',
      courseTitle: status.importResult?.course?.title || course.scormCourseTitle || '',
    })
  } catch (error) {
    return scormErrorResponse(error)
  }
}
