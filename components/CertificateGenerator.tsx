'use client';

import { useRef, useEffect } from 'react';

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

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 1414;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = '/certifates.png';

    img.onload = () => {
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const centerX = CANVAS_WIDTH / 2;

      // ===== STUDENT NAME (very large and visible) =====
      ctx.font = 'bold 80px "Brush Script MT", cursive';
      ctx.fillStyle = '#1e3a8a'; // Dark blue
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(studentName, centerX, 650);

      // ===== COURSE NAME (very large and visible) =====
      ctx.font = 'bold 48px "Georgia", serif';
      ctx.fillStyle = '#166534'; // Dark green
      ctx.fillText(courseName, centerX, 800);

      // ===== COMPLETION DATE (very large and visible) =====
      ctx.font = '28px "Georgia", serif';
      ctx.fillStyle = '#000000'; // Black for maximum visibility
      ctx.fillText(`Completed on ${completionDate}`, centerX, 950);

      // ===== CERTIFICATE ID (very large, bold, black) =====
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#000000'; // Black for maximum visibility
      ctx.fillText(`Certificate ID: ${certificateId}`, centerX, 1060);
    };
  }, [studentName, courseName, completionDate, certificateId]);

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