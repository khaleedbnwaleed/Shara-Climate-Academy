
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Loader2,
  RefreshCw,
  DollarSign,
  Shield,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

type PaymentStatus = 'pending' | 'verified' | 'rejected';

type Payment = {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: PaymentStatus;
  submittedAt: Date;
  proofImage?: string;
  verifiedAt?: Date | Timestamp;
  verifiedBy?: string;
  rejectedAt?: Date | Timestamp;
  rejectedBy?: string;
};

type PaymentDocument = {
  reference?: unknown;
  userId?: unknown;
  userName?: unknown;
  userEmail?: unknown;
  courseId?: unknown;
  courseTitle?: unknown;
  amount?: unknown;
  status?: unknown;
  submittedAt?: unknown;
  proofImage?: unknown;
  verifiedAt?: unknown;
  verifiedBy?: unknown;
  rejectedAt?: unknown;
  rejectedBy?: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

function toPayment(
  id: string,
  data: PaymentDocument
): Payment {
  const status: PaymentStatus =
    data.status === 'verified' || data.status === 'rejected'
      ? data.status
      : 'pending';

  return {
    id,
    reference:
      typeof data.reference === 'string' ? data.reference : id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    userName:
      typeof data.userName === 'string' ? data.userName : 'Unknown user',
    userEmail:
      typeof data.userEmail === 'string' ? data.userEmail : '',
    courseId:
      typeof data.courseId === 'string' ? data.courseId : '',
    courseTitle:
      typeof data.courseTitle === 'string'
        ? data.courseTitle
        : 'Unknown course',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    status,
    submittedAt: toDate(data.submittedAt),
    proofImage:
      typeof data.proofImage === 'string'
        ? data.proofImage
        : undefined,
    verifiedAt:
      data.verifiedAt instanceof Timestamp ||
      data.verifiedAt instanceof Date
        ? data.verifiedAt
        : undefined,
    verifiedBy:
      typeof data.verifiedBy === 'string'
        ? data.verifiedBy
        : undefined,
    rejectedAt:
      data.rejectedAt instanceof Timestamp ||
      data.rejectedAt instanceof Date
        ? data.rejectedAt
        : undefined,
    rejectedBy:
      typeof data.rejectedBy === 'string'
        ? data.rejectedBy
        : undefined,
  };
}

export default function AdminPaymentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      setLoading(false);
    } else if (!isAdmin) {
      router.push('/');
      setLoading(false);
    } else {
      void fetchPayments();
    }
  }, [user, authLoading, isAdmin, router]);

  const fetchPayments = async (): Promise<void> => {
    try {
      setLoading(true);

      const paymentsRef = collection(db, 'paymentRequests');
      const paymentsQuery = query(
        paymentsRef,
        orderBy('submittedAt', 'desc')
      );

      const snapshot = await getDocs(paymentsQuery);

      const paymentsData: Payment[] = snapshot.docs.map((paymentDoc) =>
        toPayment(
          paymentDoc.id,
          paymentDoc.data() as PaymentDocument
        )
      );

      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (payment: Payment): Promise<void> => {
    const confirmMsg =
      'Verify payment from ' +
      payment.userName +
      ' for ' +
      payment.courseTitle +
      '?';

    if (!confirm(confirmMsg)) return;

    setProcessingId(payment.reference);

    try {
      const paymentRef = doc(db, 'paymentRequests', payment.id);

      await updateDoc(paymentRef, {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: user?.email ?? '',
      });

      if (payment.userId) {
        const userRef = doc(db, 'users', payment.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const enrolledCourses: string[] = Array.isArray(
            userSnap.data().enrolledCourses
          )
            ? userSnap
                .data()
                .enrolledCourses.filter(
                  (courseId: unknown): courseId is string =>
                    typeof courseId === 'string'
                )
            : [];

          if (!enrolledCourses.includes(payment.courseId)) {
            await updateDoc(userRef, {
              enrolledCourses: [
                ...enrolledCourses,
                payment.courseId,
              ],
            });

            if (payment.courseId) {
              const courseRef = doc(db, 'courses', payment.courseId);
              const courseSnap = await getDoc(courseRef);

              if (courseSnap.exists()) {
                const currentStudents =
                  typeof courseSnap.data().totalStudents === 'number'
                    ? courseSnap.data().totalStudents
                    : 0;

                await updateDoc(courseRef, {
                  totalStudents: currentStudents + 1,
                });
              }
            }
          }
        }
      }

      alert(
        ' Payment verified! ' +
          payment.userName +
          ' enrolled in ' +
          payment.courseTitle
      );

      await fetchPayments();
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to verify payment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (payment: Payment): Promise<void> => {
    const confirmMsg =
      'Reject payment from ' + payment.userName + '?';

    if (!confirm(confirmMsg)) return;

    setProcessingId(payment.reference);

    try {
      const paymentRef = doc(db, 'paymentRequests', payment.id);

      await updateDoc(paymentRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user?.email ?? '',
      });

      alert(' Payment rejected');
      await fetchPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment');
    } finally {
      setProcessingId(null);
    }
  };

  const fixCourseStudentCount = async (
    courseId: string,
    courseTitle: string
  ): Promise<void> => {
    const fixMsg =
      'Recalculate student count for ' + courseTitle + '?';

    if (!confirm(fixMsg)) return;

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let enrolledCount = 0;

      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        const enrolledCourses: unknown = userData.enrolledCourses;

        if (
          Array.isArray(enrolledCourses) &&
          enrolledCourses.includes(courseId)
        ) {
          enrolledCount++;
        }
      });

      const courseRef = doc(db, 'courses', courseId);

      await updateDoc(courseRef, {
        totalStudents: enrolledCount,
      });

      alert(
        '✅ Fixed! ' +
          courseTitle +
          ' now has ' +
          enrolledCount +
          ' students'
      );

      await fetchPayments();
    } catch (error) {
      console.error('Error fixing student count:', error);
      alert('Failed to fix count');
    }
  };

  const pendingPayments = payments.filter(
    (payment) => payment.status === 'pending'
  );

  const verifiedPayments = payments.filter(
    (payment) => payment.status === 'verified'
  );

  const rejectedPayments = payments.filter(
    (payment) => payment.status === 'rejected'
  );

  const filteredPayments = (
    paymentList: Payment[]
  ): Payment[] => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return paymentList;

    return paymentList.filter(
      (payment) =>
        payment.userName.toLowerCase().includes(search) ||
        payment.userEmail.toLowerCase().includes(search) ||
        payment.courseTitle.toLowerCase().includes(search) ||
        payment.reference.toLowerCase().includes(search)
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        <p className="ml-2">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-2">
              Access Denied
            </h2>
            <p className="text-gray-500">
              You don&apos;t have permission to view this page.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push('/')}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            Payment Verification
          </h1>
          <p className="text-sm text-gray-500">
            Review and verify bank transfer payments
          </p>
        </div>

        <Button
          onClick={() => void fetchPayments()}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  Pending Payments
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {pendingPayments.length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  Verified Payments
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {verifiedPayments.length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  Total Pending Amount
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  ₦
                  {pendingPayments
                    .reduce(
                      (sum, payment) => sum + payment.amount,
                      0
                    )
                    .toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, course, or reference..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-6">
              {filteredPayments(pendingPayments).length === 0 ? (
                <div className="text-center py-12">
                  <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No pending payments found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2">Reference</th>
                        <th className="text-left p-2">Student</th>
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Proof</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments(pendingPayments).map(
                        (payment) => (
                          <tr
                            key={payment.id}
                            className="border-b"
                          >
                            <td className="p-2 font-mono text-xs">
                              {payment.reference}
                            </td>
                            <td className="p-2">
                              <div>
                                <p className="font-medium">
                                  {payment.userName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {payment.userEmail}
                                </p>
                              </div>
                            </td>
                            <td className="p-2">
                              {payment.courseTitle}
                            </td>
                            <td className="p-2 font-bold text-green-600">
                              ₦{payment.amount.toLocaleString()}
                            </td>
                            <td className="p-2 text-sm">
                              {payment.submittedAt.toLocaleDateString()}
                            </td>
                            <td className="p-2">
                              {payment.proofImage && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowImageDialog(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    void handleVerify(payment)
                                  }
                                  disabled={
                                    processingId === payment.reference
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingId === payment.reference ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    void handleReject(payment)
                                  }
                                  disabled={
                                    processingId === payment.reference
                                  }
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardContent className="p-6">
              {filteredPayments(verifiedPayments).length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No verified payments found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2">Reference</th>
                        <th className="text-left p-2">Student</th>
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments(verifiedPayments).map(
                        (payment) => (
                          <tr
                            key={payment.id}
                            className="border-b"
                          >
                            <td className="p-2 font-mono text-xs">
                              {payment.reference}
                            </td>
                            <td className="p-2">
                              <div>
                                <p className="font-medium">
                                  {payment.userName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {payment.userEmail}
                                </p>
                              </div>
                            </td>
                            <td className="p-2">
                              {payment.courseTitle}
                            </td>
                            <td className="p-2 font-bold text-green-600">
                              ₦{payment.amount.toLocaleString()}
                            </td>
                            <td className="p-2 text-sm">
                              {payment.submittedAt.toLocaleDateString()}
                            </td>
                            <td className="p-2">
                              {payment.courseId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void fixCourseStudentCount(
                                      payment.courseId,
                                      payment.courseTitle
                                    )
                                  }
                                >
                                  Fix Count
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardContent className="p-6">
              {filteredPayments(rejectedPayments).length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No rejected payments found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2">Reference</th>
                        <th className="text-left p-2">Student</th>
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments(rejectedPayments).map(
                        (payment) => (
                          <tr
                            key={payment.id}
                            className="border-b"
                          >
                            <td className="p-2 font-mono text-xs">
                              {payment.reference}
                            </td>
                            <td className="p-2">
                              <div>
                                <p className="font-medium">
                                  {payment.userName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {payment.userEmail}
                                </p>
                              </div>
                            </td>
                            <td className="p-2">
                              {payment.courseTitle}
                            </td>
                            <td className="p-2 font-bold text-red-600">
                              ₦{payment.amount.toLocaleString()}
                            </td>
                            <td className="p-2 text-sm">
                              {payment.submittedAt.toLocaleDateString()}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={showImageDialog}
        onOpenChange={setShowImageDialog}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Transaction reference: {selectedPayment?.reference}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {selectedPayment?.proofImage && (
              <img
                src={selectedPayment.proofImage}
                alt="Payment Proof"
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}