# SCORM Cloud integration

## What is connected

- Instructors can import a SCORM ZIP into SCORM Cloud from the course
  management page, check the import job, and view learner completion, pass/fail,
  score and tracked time.
- Instructors may also submit a package URL hosted on an administrator-approved
  HTTPS domain. SCORM Cloud fetches the ZIP directly.
- Enrolled learners get a short-lived SCORM Cloud launch link displayed in an
  iframe on their course page. The SCORM player returns to its completion
  message; learners can close the player and refresh their progress.
- Registration IDs and learner IDs are random pseudonyms. Learner email,
  Firebase UID and name are not sent to SCORM Cloud. Instructors see academy
  learner names in the course report.
- API credentials and Firebase Admin access are used only by Node.js route
  handlers. Routes verify Firebase ID tokens, enforce instructor/learner roles,
  course ownership and enrollment, and do not accept a client-supplied SCORM
  registration ID.

SCORM Cloud routes use the V2 API documented at
<https://cloud.scorm.com/docs/v2/>. The implementation uses package import
jobs, registration creation, temporary launch links and registration progress.

## Required configuration

Set these in local `.env.local` or the deployment platform's encrypted
environment-variable settings. `.env.example` contains placeholders only.

- `SCORM_CLOUD_APP_ID`: SCORM Cloud application ID.
- `SCORM_CLOUD_SECRET_KEY`: active secret key for that application.
- `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`: base64 encoding of a Firebase Admin
  service-account JSON file for the existing Firebase project.
- `SCORM_ALLOWED_PACKAGE_HOSTS`: comma-separated HTTPS hostnames instructors
  may use for remotely hosted ZIP packages.

For PowerShell, encode the service account file locally with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

Paste the result directly into the encrypted local/deployment secret setting.
Do not commit the service-account JSON or its encoded contents.

The Firebase service account has privileged project access. Use a dedicated
service identity, restrict who can change deployment secrets, and rotate the
key if it is exposed. SCORM Cloud credentials must not be sent to the browser.

## Package and progress behavior

- Direct ZIP uploads are limited to 4 MB to stay within the current serverless
  request limit. Larger packages must be hosted at an HTTPS hostname in
  `SCORM_ALLOWED_PACKAGE_HOSTS`; SCORM Cloud fetches them from that host.
- ZIP uploads require a `.zip` extension and ZIP file signature. SCORM package
  validity is ultimately determined by SCORM Cloud's import job.
- An import does not become available to learners until SCORM Cloud reports
  `COMPLETE`.
- The existing academy course progress and certificate logic remain separate
  from SCORM Cloud progress. SCORM completion is shown in its own learner
  status and instructor report; it does not automatically award the academy
  certificate.
- The instructor report refreshes each registration from SCORM Cloud and is
  limited to the most recent 100 registrations per course.
- Trial SCORM Cloud accounts impose vendor limits on active courses,
  registrations and storage; review current account limits and pricing before
  production use.

## Deployment and verification

Install the project's locked dependencies, configure the secrets above in a
non-production test environment, and import a test package before enabling the
feature for learners. Test package import errors, retry behavior, role and
enrollment denials, learner launch, completion/pass/fail reporting, and secret
absence from browser bundles and logs. A deployment with missing credentials
fails closed with an explanatory configuration error.

Credentials have not been supplied in the repository or current environment,
so a live SCORM Cloud import/launch cannot be verified from this checkout.
