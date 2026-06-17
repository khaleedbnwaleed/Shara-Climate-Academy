'use client';

import { useRef, useEffect, useState } from 'react';
import { generateCertificateQR } from '@/lib/qr-utils';

interface CertificateProps {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
}

export default function CertificateGenerator({ 
  studentName, 
  courseName, 
  completionDate, 
  certificateId 
}: CertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 1414;

  useEffect(() => {
    const generateQR = async () => {
      const qr = await generateCertificateQR(certificateId, studentName, courseName);
      setQrCode(qr);
    };
    generateQR();
  }, [certificateId, studentName, courseName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = '/certifates.png';

    img.onload = () => {
      // Draw template (contains signatures already)
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const centerX = CANVAS_WIDTH / 2;

      // ===== STUDENT NAME =====
      ctx.font = 'bold 80px "Brush Script MT", cursive';
      ctx.fillStyle = '#1e3a8a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(studentName, centerX, 650);

      // ===== COURSE NAME =====
      ctx.font = 'bold 48px "Georgia", serif';
      ctx.fillStyle = '#166534';
      ctx.fillText(courseName, centerX, 800);

      // ===== COMPLETION DATE =====
      ctx.font = '28px "Georgia", serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(`Completed on ${completionDate}`, centerX, 950);

      // ===== CERTIFICATE ID =====
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(`Certificate ID: ${certificateId}`, centerX, 1060);

      // ===== QR CODE - Bottom Right Corner =====
      if (qrCode) {
        const qrImage = new Image();
        qrImage.onload = () => {
          const qrSize = 160;
          const qrX = CANVAS_WIDTH - qrSize - 50;
          const qrY = CANVAS_HEIGHT - qrSize - 50;
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
          
          ctx.font = '14px "Georgia", serif';
          ctx.fillStyle = '#1a1a1a';
          ctx.textAlign = 'center';
          ctx.fillText('Scan to Verify', qrX + qrSize/2, qrY + qrSize + 30);
        };
        qrImage.src = qrCode;
      }
    };
  }, [studentName, courseName, completionDate, certificateId, qrCode]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${studentName.replace(/\s+/g, '_')}_Certificate.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="border border-gray-200 rounded-lg shadow-lg overflow-hidden max-w-full">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="w-full h-auto max-w-4xl"
        />
      </div>
      <button 
        onClick={handleDownload}
        className="px-6 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 transition-colors"
      >
        Download Certificate
      </button>
    </div>
  );
}
