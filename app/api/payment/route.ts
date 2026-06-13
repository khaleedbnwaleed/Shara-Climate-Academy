// app/api/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, amount, courseId, userId, email, courseTitle } = body;

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const verification = await verifyResponse.json();

    if (verification.data.status === 'success') {
      // Update user's enrolled courses in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        enrolledCourses: arrayUnion(courseId),
      });

      // Create enrollment record
      const enrollmentRef = doc(db, 'enrollments', reference);
      await setDoc(enrollmentRef, {
        courseId: courseId,
        userId: userId,
        amount: amount,
        reference: reference,
        status: 'completed',
        completedAt: new Date(),
        courseTitle: courseTitle,
        email: email,
      });

      return NextResponse.json({ success: true, message: 'Payment verified and course enrolled' });
    } else {
      return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}