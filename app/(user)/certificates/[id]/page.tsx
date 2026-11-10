'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Download,
  Share2,
  Award,
  Calendar,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface CourseData {
  id: string;
  title?: string;
  [key: string]: unknown;
}

interface CertificateData {
  courseId?: string;
  courseTitle?: string;
  completedDate?: string;
  certificateId?: string;
  completedAt?: string;
}

export default function IndividualCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certIdParam = params.id as string;

  const { user } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificateData, setCertificateData] =
    useState<CertificateData | null>(null);
  const [error, setError] = useState(false);

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 1414;

  const getCompletionDate = useCallback(() => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const getCertificateTitle = useCallback(() => {
    return (
      certificateData?.courseTitle ||
      course?.title ||
      'Course Completed'
    );
  }, [certificateData, course]);

  const getCertificateId = useCallback(() => {
    return (
      certificateData?.certificateId ||
      `${course?.id?.slice(0, 8)}-${user?.uid?.slice(0, 8)}`
    );
  }, [certificateData, course, user]);

  // Fetch the course and certificate information.
  const fetchCertificateData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      // Check whether the URL contains a course ID.
      const courseRef = doc(db, 'courses', certIdParam);
      const courseSnap = await getDoc(courseRef);

      if (courseSnap.exists()) {
        // Explicitly define the course data type.
        const courseData: CourseData = {
          ...courseSnap.data(),
          id: courseSnap.id,
        };

        setCourse(courseData);

        const completionDate = getCompletionDate();
        const certificateId =
          `${courseData.id.slice(0, 8)}-${user.uid.slice(0, 8)}`;

        const storageKey =
          `certificate_${user.uid}_${courseData.id}`;

        const savedCertData = localStorage.getItem(storageKey);

        if (savedCertData) {
          try {
            const parsedData = JSON.parse(
              savedCertData
            ) as CertificateData;

            setCertificateData({
              ...parsedData,
              courseId: courseData.id,
              courseTitle:
                courseData.title ||
                parsedData.courseTitle ||
                'Course Completed',
            });
          } catch {
            // Recover if the saved certificate data is invalid.
            const newCertData: CertificateData = {
              courseId: courseData.id,
              courseTitle:
                courseData.title || 'Course Completed',
              completedDate: completionDate,
              certificateId,
              completedAt: new Date().toISOString(),
            };

            setCertificateData(newCertData);
            localStorage.setItem(
              storageKey,
              JSON.stringify(newCertData)
            );
          }
        } else {
          const newCertData: CertificateData = {
            courseId: courseData.id,
            courseTitle:
              courseData.title || 'Course Completed',
            completedDate: completionDate,
            certificateId,
            completedAt: new Date().toISOString(),
          };

          setCertificateData(newCertData);
          localStorage.setItem(
            storageKey,
            JSON.stringify(newCertData)
          );
        }

        return;
      }

      // The URL may contain a certificate ID instead.
      let foundCertData: CertificateData | null = null;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (!key || !key.startsWith(`certificate_${user.uid}_`)) {
          continue;
        }

        try {
          const rawData = localStorage.getItem(key);

          if (!rawData) continue;

          const certData = JSON.parse(rawData) as CertificateData;

          const storedId = certData.certificateId;

          if (
            storedId === certIdParam ||
            storedId?.replace(/-/g, '') ===
              certIdParam.replace(/-/g, '')
          ) {
            foundCertData = certData;
            break;
          }
        } catch {
          // Ignore malformed localStorage entries.
        }
      }

      if (!foundCertData) {
        setError(true);
        return;
      }

      setCertificateData(foundCertData);

      if (foundCertData.courseId) {
        const courseRef = doc(
          db,
          'courses',
          foundCertData.courseId
        );

        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
          const courseData: CourseData = {
            ...courseSnap.data(),
            id: courseSnap.id,
          };

          setCourse(courseData);

          // Keep the displayed title synchronized with Firestore.
          setCertificateData((previous) =>
            previous
              ? {
                  ...previous,
                  courseTitle:
                    courseData.title ||
                    previous.courseTitle ||
                    'Course Completed',
                }
              : previous
          );
        } else {
          setCourse({
            id: foundCertData.courseId,
            title: foundCertData.courseTitle,
          });
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching certificate:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [certIdParam, user, getCompletionDate]);

  useEffect(() => {
    void fetchCertificateData();
  }, [fetchCertificateData]);

  // Draw the certificate preview.
  useEffect(() => {
    if (!certificateData && !course) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const certTitle = getCertificateTitle();
    const completionDate =
      certificateData?.completedDate || getCompletionDate();
    const certId = getCertificateId();

    const img = new Image();

    img.onload = () => {
      // Ensure the canvas is still mounted.
      if (!canvasRef.current) return;

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const centerX = CANVAS_WIDTH / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 80px "Brush Script MT", cursive';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText(
        user?.name || 'Student Name',
        centerX,
        650,
        CANVAS_WIDTH - 160
      );

      ctx.font = 'bold 48px Georgia, serif';
      ctx.fillStyle = '#166534';
      ctx.fillText(
        certTitle,
        centerX,
        800,
        CANVAS_WIDTH - 160
      );

      ctx.font = '28px Georgia, serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(
        `Completed on ${completionDate}`,
        centerX,
        950
      );

      ctx.font = 'bold 24px monospace';
      ctx.fillText(
        `Certificate ID: ${certId}`,
        centerX,
        1060
      );
    };

    img.onerror = () => {
      console.error(
        'Certificate template could not be loaded. Check /certifates.png.'
      );
    };

    img.src = '/certifates.png';
  }, [
    certificateData,
    course,
    user,
    getCertificateTitle,
    getCompletionDate,
    getCertificateId,
  ]);

  // Download the certificate as a PNG.
  const handleDownload = async () => {
    const certTitle = getCertificateTitle();
    const completionDate =
      certificateData?.completedDate || getCompletionDate();
    const certId = getCertificateId();

    const loadingToast = document.createElement('div');
    loadingToast.className =
      'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    loadingToast.innerText = 'Generating certificate...';

    document.body.appendChild(loadingToast);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error('Certificate template failed to load.'));
        img.src = '/certifates.png';
      });

      const canvas = document.createElement('canvas');

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Unable to create the certificate canvas.');
      }

      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const centerX = CANVAS_WIDTH / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 80px "Brush Script MT", cursive';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText(
        user?.name || 'Student Name',
        centerX,
        650,
        CANVAS_WIDTH - 160
      );

      ctx.font = 'bold 48px Georgia, serif';
      ctx.fillStyle = '#166534';
      ctx.fillText(
        certTitle,
        centerX,
        800,
        CANVAS_WIDTH - 160
      );

      ctx.font = '28px Georgia, serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(
        `Completed on ${completionDate}`,
        centerX,
        950
      );

      ctx.font = 'bold 24px monospace';
      ctx.fillText(
        `Certificate ID: ${certId}`,
        centerX,
        1060
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create the PNG file.'));
          }
        }, 'image/png');
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        `certificate-${certTitle.replace(/\s+/g, '-')}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      loadingToast.remove();
    }
  };

  // Share the certificate.
  const handleShare = async () => {
    const certTitle = getCertificateTitle();

    const shareData = {
      title: `My Certificate - ${certTitle}`,
      text: `I completed "${certTitle}" on Shara Climate Academy! 🌍`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Cancellation by the user is not an application error.
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing certificate:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        alert('Certificate link copied to clipboard!');
      } catch (err) {
        console.error('Unable to copy certificate link:', err);
        alert('Unable to copy the link. Please copy the page URL manually.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error || (!course && !certificateData)) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="text-center py-8 max-w-md">
          <CardContent>
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />

            <p className="text-gray-600 mb-2">
              Certificate not found
            </p>

            <p className="text-xs text-gray-400 mb-4">
              ID: {certIdParam}
            </p>

            <Link href="/certificates">
              <Button className="bg-green-700">
                Back to Certificates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const certTitle = getCertificateTitle();
  const completionDate =
    certificateData?.completedDate || getCompletionDate();
  const certId = getCertificateId();

  return (
    <div className="flex-1">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 via-green-800 to-emerald-900 px-8 py-8 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Certificate of Completion
              </h2>

              <p className="text-green-200">
                Shara Climate Academy
              </p>
            </div>

            <div className="p-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full h-auto"
                  aria-label="Certificate of course completion"
                />
              </div>

              <div className="mt-6 text-center">
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {user?.name || 'Student Name'}
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  successfully completed
                </p>

                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4">
                  {certTitle}
                </h3>

                <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{completionDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span className="font-mono text-xs">
                      {certId}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleDownload}
                className="bg-green-700 hover:bg-green-800 gap-2"
              >
                <Download className="h-4 w-4" />
                Download Certificate (PNG)
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link href="/certificates">
              <Button variant="outline" className="gap-2">
                All Certificates
              </Button>
            </Link>

            <Link href="/courses">
              <Button className="bg-green-700 hover:bg-green-800 gap-2">
                <ExternalLink className="h-4 w-4" />
                Explore More Courses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}