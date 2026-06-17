import QRCode from 'qrcode';

export async function generateCertificateQR(certificateId: string, studentName: string, courseName: string) {
  // Detect environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Use different URLs based on environment
  let baseUrl: string;
  
  if (isProduction) {
    // Production URL
    baseUrl = 'https://shara-climate-academy.vercel.app';
  } else if (isDevelopment) {
    // Local development - use localhost
    baseUrl = 'http://localhost:3000';
  } else {
    // Fallback
    baseUrl = 'https://shara-climate-academy.vercel.app';
  }
  
  const verificationUrl = `${baseUrl}/verify-certificate?id=${certificateId}`;
  
  console.log('📱 QR Code URL:', verificationUrl); // Debug log
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 200,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Error:', error);
    return null;
  }
}
