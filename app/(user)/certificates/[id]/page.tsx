'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Download, Share2, Award, Calendar, ExternalLink, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

export default function IndividualCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certIdParam = params.id as string;
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [error, setError] = useState(false);

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 1414;

  useEffect(() => {
    fetchCertificateData();
  }, [certIdParam, user]);

  // Draw certificate on canvas when data is loaded
  useEffect(() => {
    if (!certificateData && !course) return;
    if (!canvasRef.current) return;
    
    drawCertificate();
  }, [certificateData, course, user]);

  const drawCertificate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const certTitle = certificateData?.courseTitle || course?.title || 'Course Completed';
    const completionDate = certificateData?.completedDate || new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const certId = certificateData?.certificateId || `${course?.id?.slice(0, 8)}-${user?.uid?.slice(0, 8)}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/certifates.png';
    
    img.onload = () => {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const centerX = CANVAS_WIDTH / 2;
      
      ctx.font = 'bold 80px "Brush Script MT", cursive';
      ctx.fillStyle = '#1e3a8a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(user?.name || 'Student Name', centerX, 650);
      
      ctx.font = 'bold 48px "Georgia", serif';
      ctx.fillStyle = '#166534';
      ctx.fillText(certTitle, centerX, 800);
      
      ctx.font = '28px "Georgia", serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(`Completed on ${completionDate}`, centerX, 950);
      
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(`Certificate ID: ${certId}`, centerX, 1060);
    };
  };

  const fetchCertificateData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First, check if this is a course ID or certificate ID
      const courseRef = doc(db, 'courses', certIdParam);
      const courseSnap = await getDoc(courseRef);
      
      if (courseSnap.exists()) {
        // This is a course ID - generate certificate from course data
        const courseData = { id: courseSnap.id, ...courseSnap.data() };
        setCourse(courseData);
        
        // Generate certificate data from course
        const completionDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        const certificateId = `${courseData.id.slice(0, 8)}-${user.uid.slice(0, 8)}`;
        
        // Check if certificate exists in localStorage
        const savedCertData = localStorage.getItem(`certificate_${user.uid}_${courseData.id}`);
        if (savedCertData) {
          setCertificateData(JSON.parse(savedCertData));
        } else {
          // Create new certificate data
          const newCertData = {
            courseId: courseData.id,
            courseTitle: courseData.title,
            completedDate: completionDate,
            certificateId: certificateId,
            completedAt: new Date().toISOString()
          };
          setCertificateData(newCertData);
        }
        setLoading(false);
        return;
      }
      
      // If not a course ID, search for certificate in localStorage
      let foundCertData = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`certificate_${user.uid}_`)) {
          const certData = JSON.parse(localStorage.getItem(key) || '{}');
          if (certData.certificateId === certIdParam || 
              certData.certificateId?.replace(/-/g, '') === certIdParam) {
            foundCertData = certData;
            break;
          }
        }
      }
      
      if (foundCertData) {
        setCertificateData(foundCertData);
        // Fetch course details
        const courseRef2 = doc(db, 'courses', foundCertData.courseId);
        const courseSnap2 = await getDoc(courseRef2);
        if (courseSnap2.exists()) {
          setCourse({ id: courseSnap2.id, ...courseSnap2.data() });
        } else {
          setCourse({ id: foundCertData.courseId, title: foundCertData.courseTitle });
        }
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const certTitle = certificateData?.courseTitle || course?.title || 'Course Completed';
    const completionDate = certificateData?.completedDate || new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    const certId = certificateData?.certificateId || `${course?.id?.slice(0, 8)}-${user?.uid?.slice(0, 8)}`;
    
    const loadingToast = document.createElement('div');
    loadingToast.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    loadingToast.innerText = 'Generating certificate...';
    document.body.appendChild(loadingToast);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = '/certifates.png';
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        
        ctx.font = 'bold 80px "Brush Script MT", cursive';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.fillText(user?.name || 'Student Name', centerX, 650);
        
        ctx.font = 'bold 48px "Georgia", serif';
        ctx.fillStyle = '#166534';
        ctx.fillText(certTitle, centerX, 800);
        
        ctx.font = '28px "Georgia", serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Completed on ${completionDate}`, centerX, 950);
        
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Certificate ID: ${certId}`, centerX, 1060);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${certTitle.replace(/\s/g, '-')}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png', 1);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      document.body.removeChild(loadingToast);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `My Certificate - ${certificateData?.courseTitle || course?.title}`,
      text: `I completed "${certificateData?.courseTitle || course?.title}" on Shara Climate Academy! 🌍`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(shareData.text);
      alert('Text copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || (!course && !certificateData)) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="text-center py-8 max-w-md">
          <CardContent>
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Certificate not found</p>
            <p className="text-xs text-gray-400 mb-4">ID: {certIdParam}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/certificates">
                <Button className="bg-green-700">Back to Certificates</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const certTitle = certificateData?.courseTitle || course?.title || 'Course Completed';
  const completionDate = certificateData?.completedDate || new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const certId = certificateData?.certificateId || `${course?.id?.slice(0, 8)}-${user?.uid?.slice(0, 8)}`;

  return (
    <div className="flex-1">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 via-green-800 to-emerald-900 px-8 py-8 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Certificate of Completion</h2>
              <p className="text-green-200">Shara Climate Academy</p>
            </div>

            <div className="p-6">
              {/* Canvas Certificate Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <canvas 
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full h-auto"
                />
              </div>

              {/* Certificate Info */}
              <div className="mt-6 text-center">
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {user?.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  successfully completed
                </p>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4">
                  {certTitle}
                </h3>
                <div className="flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{completionDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span className="font-mono text-xs">{certId}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap gap-3 justify-center">
              <Button onClick={handleDownload} className="bg-green-700 hover:bg-green-800 gap-2">
                <Download className="h-4 w-4" /> Download Certificate (PNG)
              </Button>
              <Button onClick={handleShare} variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" /> Share
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
                <ExternalLink className="h-4 w-4" /> Explore More Courses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}