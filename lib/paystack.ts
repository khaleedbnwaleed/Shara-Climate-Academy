// lib/paystack.ts
interface PaystackConfig {
  amount: number;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  coursePrice: number;
}

export const initializePaystackPayment = async (config: PaystackConfig) => {
  const { amount, email, name, courseId, courseTitle } = config;
  
  // Load Paystack script dynamically
  const paystackScript = document.createElement('script');
  paystackScript.src = 'https://js.paystack.co/v1/inline.js';
  document.body.appendChild(paystackScript);

  return new Promise((resolve, reject) => {
    paystackScript.onload = () => {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: amount * 100, // Paystack expects amount in kobo
        currency: 'NGN',
        metadata: {
          custom_fields: [
            {
              display_name: "Course Name",
              variable_name: "course_title",
              value: courseTitle
            },
            {
              display_name: "Course ID",
              variable_name: "course_id",
              value: courseId
            },
            {
              display_name: "Student Name",
              variable_name: "student_name",
              value: name
            }
          ]
        },
        callback: (response: any) => {
          resolve(response);
        },
        onClose: () => {
          reject(new Error('Payment window closed'));
        }
      });
      handler.openIframe();
    };
  });
};