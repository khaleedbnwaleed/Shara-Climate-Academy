'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Banknote, Copy, CheckCircle, Upload, FileText, 
  AlertCircle, ArrowLeft, Loader2, Clock, CreditCard,
  Building2, User, Hash, DollarSign
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

export default function BankTransferPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const courseId = searchParams.get('courseId');
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bank details 
    const bankDetails = {
    bankName: 'sterling bank',
    accountName: 'Shara Eco Solution Ltd',
    accountNumber: '0132173778',
    sortCode: '058-123-456',
    swiftCode: 'GTBINGLA'
    };

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/user/payment/bank-transfer');
      return;
    }
    if (courseId) {
      fetchCourse();
    } else {
      router.push('/courses');
    }
  }, [courseId, user, router]);

  const fetchCourse = async () => {
    try {
      const courseRef = doc(db, 'courses', courseId!);
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) {
        setCourse({ id: courseSnap.id, ...courseSnap.data() });
      } else {
        router.push('/courses');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setMessage({ type: 'error', text: 'Failed to load course details' });
    } finally {
      setLoading(false);
    }
  };

  const generateReference = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ref = `SCA-${timestamp}-${random}`;
    setTransactionRef(ref);
    return ref;
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setMessage({ type: 'success', text: `${field} copied!` });
      setTimeout(() => {
        setCopiedField(null);
        setMessage(null);
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to copy' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please upload an image file (PNG, JPG, JPEG)' });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' });
        return;
      }
      setUploadedFile(file);
      setMessage(null);
    }
  };

  const handleSubmit = async () => {
    if (!transactionRef) {
      setMessage({ type: 'error', text: 'Please generate a reference number first' });
      return;
    }
    if (!uploadedFile) {
      setMessage({ type: 'error', text: 'Please upload your payment proof/screenshot' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile);
      reader.onload = async () => {
        const paymentData = {
          reference: transactionRef,
          courseId: course.id,
          courseTitle: course.title,
          amount: course.price,
          userId: user?.uid,
          userName: user?.name || user?.displayName || 'Student',
          userEmail: user?.email,
          status: 'pending',
          paymentMethod: 'bank_transfer',
          submittedAt: new Date(),
          proofImage: reader.result,
          bankDetails: {
            accountName: bankDetails.accountName,
            accountNumber: bankDetails.accountNumber,
            bankName: bankDetails.bankName
          }
        };

        // Save payment request to Firestore
        await setDoc(doc(db, 'paymentRequests', transactionRef), paymentData);
        
        setMessage({ 
          type: 'success', 
          text: ' Payment proof submitted successfully! Your enrollment will be processed within 24 hours.' 
        });
        
        // Clear form
        setUploadedFile(null);
        setTransactionRef('');
        
        // Redirect after 3 seconds
    setTimeout(() => {
    router.push('/courses');  //  Redirect to courses listing
    }, 3000);
      };
    } catch (error) {
      console.error('Error submitting payment:', error);
      setMessage({ type: 'error', text: 'Failed to submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="text-center p-8">
          <p className="text-gray-500">Course not found</p>
          <Button onClick={() => router.push('/courses')} className="mt-4 bg-green-700">
            Browse Courses
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Course
          </button>
          
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Bank Transfer Payment</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Complete your payment via bank transfer to enroll in <span className="font-semibold">{course.title}</span>
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
              : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Paystack Coming Soon Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-400">Paystack Integration Coming Soon!</p>
              <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                While we wait for Paystack approval, you can pay via bank transfer. 
                Once approved, you'll have the option to pay instantly with card, USSD, or bank transfer.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Details Card */}
          <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Transfer Details</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Make payment to this account</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Bank Name */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bank Name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{bankDetails.bankName}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.bankName, 'Bank name')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Account Name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{bankDetails.accountName}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.accountName, 'Account name')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Account Number */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Account Number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-green-600 dark:text-green-400 tracking-wider">
                      {bankDetails.accountNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account number')}
                      className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4 text-green-600" />
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Amount to Pay</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₦{course.price?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                  ⚠️ <strong>Important:</strong> Transfer the exact amount and use your generated reference number as payment description for faster verification.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof Submission Card */}
          <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submit Payment Proof</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload your transfer screenshot</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Transaction Reference */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Transaction Reference
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Enter or generate reference"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={generateReference}
                      className="gap-2"
                    >
                      <span className="hidden sm:inline">Generate</span>
                      <span className="sm:hidden">Gen</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use this reference when making the bank transfer
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Upload Payment Proof
                  </label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-900/30 transition cursor-pointer ${
                    uploadedFile 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer block">
                      {uploadedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-10 w-10 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <p className="text-xs text-green-600">Click to change file</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload screenshot of your transfer
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            PNG, JPG up to 5MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-400">Verification Process</p>
                      <ul className="text-xs text-blue-700 dark:text-blue-500 mt-1 space-y-1 list-disc list-inside">
                        <li>After submitting, your payment will be verified within 24 hours</li>
                        <li>You'll receive an email confirmation once verified</li>
                        <li>Course access will be granted immediately after verification</li>
                        <li>Contact support if verification takes longer than 24 hours</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !transactionRef || !uploadedFile}
                  className="w-full bg-green-700 hover:bg-green-800 h-12 text-base font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Submit Payment Proof
                    </>
                  )}
                </Button>

                {/* Help Text */}
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  Need help? Contact us at{' '}
                  <a href="mailto:support@sharaclimateacademy.com" className="text-green-600 hover:underline">
                    support@sharaclimateacademy.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}