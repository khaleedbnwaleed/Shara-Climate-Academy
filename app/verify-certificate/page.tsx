"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Award, CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyCertificateContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get('id');
  const [verification, setVerification] = useState<{
    valid: boolean;
    studentName?: string;
    courseName?: string;
    date?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certificateId) {
      setTimeout(() => {
        setVerification({
          valid: true,
          studentName: "Test Student",
          courseName: "Climate Change Fundamentals",
          date: "June 15, 2026"
        });
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
      setVerification({ valid: false });
    }
  }, [certificateId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        <p className="text-gray-500">Verifying certificate...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          {verification?.valid ? (
            <CheckCircle className="h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold mb-4">
          {verification?.valid ? '✅ Valid Certificate' : '❌ Invalid Certificate'}
        </h1>
        
        {verification?.valid ? (
          <div className="space-y-3">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-500">Issued to</p>
              <p className="text-xl font-semibold">{verification.studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Course</p>
              <p className="text-lg font-medium">{verification.courseName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion Date</p>
              <p className="text-gray-700">{verification.date}</p>
            </div>
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This certificate was issued by <strong>Shara Climate Academy</strong>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Certificate ID: {certificateId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-red-500">
              This certificate could not be verified.
            </p>
            <p className="text-sm text-gray-500">
              Please contact Shara Climate Academy for assistance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <VerifyCertificateContent />
    </Suspense>
  );
}