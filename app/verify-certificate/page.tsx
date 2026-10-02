"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

function VerifyCertificateContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get('id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center" role="status" aria-live="polite">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Certificate verification unavailable</h1>
        
        <p className="text-gray-700 dark:text-gray-300">
          We can’t confirm certificate {certificateId ? <span className="font-mono">{certificateId}</span> : 'details'} online right now.
        </p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No validity claim has been made. Please contact Shara Climate Academy to confirm this certificate.
        </p>
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