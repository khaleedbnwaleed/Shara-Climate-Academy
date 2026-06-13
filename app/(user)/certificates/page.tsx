'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Award, Download, Calendar, Archive, AlertCircle, Eye } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import CertificateGenerator from '@/components/CertificateGenerator';

interface CertificateCourse {
  id: string;
  title: string;
  completed: boolean;
  isDeleted?: boolean;
  completedDate: string;
  certificateId: string;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [certificates, setCertificates] = useState<CertificateCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateCourse | null>(null);

  useEffect(() => {
    if (user?.completedCourses) {
      fetchCertificates();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCertificates = async () => {
    try {
      const certificatesList: CertificateCourse[] = [];
      
      for (const courseId of (user?.completedCourses || [])) {
        const savedCertData = localStorage.getItem(`certificate_${user?.uid}_${courseId}`);
        let certificateData: any = null;
        
        if (savedCertData) {
          certificateData = JSON.parse(savedCertData);
        }
        
        let isDeleted = false;
        let courseTitle = certificateData?.courseTitle || '';
        
        try {
          const courseRef = doc(db, 'courses', courseId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            courseTitle = courseData.title;
            isDeleted = false;
          } else {
            isDeleted = true;
            if (!courseTitle && certificateData?.courseTitle) {
              courseTitle = certificateData.courseTitle;
            } else if (!courseTitle) {
              courseTitle = 'Completed Course';
            }
          }
        } catch (error) {
          isDeleted = true;
          if (!courseTitle && certificateData?.courseTitle) {
            courseTitle = certificateData.courseTitle;
          } else if (!courseTitle) {
            courseTitle = 'Completed Course';
          }
        }
        
        const certificateId = certificateData?.certificateId || `${courseId.slice(0, 8)}-${user?.uid?.slice(0, 8)}`;
        
        let completedDate = certificateData?.completedDate || '';
        if (!completedDate) {
          completedDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          localStorage.setItem(`certificate_${user?.uid}_${courseId}`, JSON.stringify({
            courseId,
            courseTitle: courseTitle,
            completedDate,
            certificateId
          }));
        }
        
        certificatesList.push({
          id: courseId,
          title: courseTitle,
          completed: true,
          isDeleted,
          completedDate,
          certificateId
        });
      }
      
      certificatesList.sort((a, b) => {
        if (a.completedDate > b.completedDate) return -1;
        if (a.completedDate < b.completedDate) return 1;
        return 0;
      });
      
      setCertificates(certificatesList);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certificate: CertificateCourse) => {
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
        
        // Student Name - Very visible
        ctx.font = 'bold 80px "Brush Script MT", cursive';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.fillText(user?.name || 'Student Name', centerX, 650);
        
        // Course Name - Very visible
        ctx.font = 'bold 48px "Georgia", serif';
        ctx.fillStyle = '#166534';
        ctx.fillText(certificate.title, centerX, 800);
        
        // Completion Date - Very visible
        ctx.font = '28px "Georgia", serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Completed on ${certificate.completedDate}`, centerX, 950);
        
        // Certificate ID - Very visible (bold, large, black)
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Certificate ID: ${certificate.certificateId}`, centerX, 1060);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${certificate.title.replace(/\s/g, '-')}.png`;
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

  const handleViewCertificate = (certificate: CertificateCourse) => {
    setSelectedCertificate(certificate);
    setShowViewModal(true);
  };

  const fixMissingCertificateData = () => {
    if (!user) return;
    
    certificates.forEach(cert => {
      if (!localStorage.getItem(`certificate_${user.uid}_${cert.id}`)) {
        const certData = {
          courseId: cert.id,
          courseTitle: cert.title,
          completedDate: cert.completedDate || new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          certificateId: cert.certificateId
        };
        localStorage.setItem(`certificate_${user.uid}_${cert.id}`, JSON.stringify(certData));
      }
    });
    alert('Certificate data has been fixed! Refresh the page.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const validCertificates = certificates.filter(c => !c.isDeleted);
  const archivedCertificates = certificates.filter(c => c.isDeleted);

  return (
    <div className="flex-1">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            My Certificates
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and download your earned certificates
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {archivedCertificates.length > 0 && (
          <div className="mb-4 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fixMissingCertificateData}
              className="text-yellow-600 border-yellow-600"
            >
              Fix Certificate Data
            </Button>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <div className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-sm text-gray-500">Total Certificates</span>
            <span className="ml-2 font-bold text-green-600">{certificates.length}</span>
          </div>
        </div>

        {certificates.length > 0 ? (
          <div className="space-y-6">
            {validCertificates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Active Certificates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {validCertificates.map((certificate) => (
                    <div key={certificate.id} className={`rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                      <div className="h-32 bg-gradient-to-r from-green-700 via-green-800 to-emerald-900 flex items-center justify-center relative">
                        <Award className="h-12 w-12 text-white opacity-80" />
                      </div>
                      <div className="p-5">
                        <h3 className={`font-semibold text-base line-clamp-1 mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {certificate.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Calendar className="h-3 w-3" />
                          <span>Earned on {certificate.completedDate}</span>
                        </div>
                        <p className={`text-xs mb-3 font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ID: {certificate.certificateId}
                        </p>
                        <div className="flex gap-2">
                          <Button onClick={() => handleDownloadCertificate(certificate)} className="flex-1 bg-green-700 hover:bg-green-800" size="sm">
                            <Download className="mr-1 h-3 w-3" /> Download
                          </Button>
                          <Button 
                            onClick={() => handleViewCertificate(certificate)} 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {archivedCertificates.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archived Certificates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {archivedCertificates.map((certificate) => (
                    <div key={certificate.id} className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="h-32 bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700 flex items-center justify-center relative">
                        <Archive className="h-12 w-12 text-white opacity-80" />
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">Archived Course</span>
                        </div>
                        <h3 className={`font-semibold text-base line-clamp-1 mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {certificate.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Calendar className="h-3 w-3" />
                          <span>Earned on {certificate.completedDate}</span>
                        </div>
                        <p className={`text-xs mb-3 font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          ID: {certificate.certificateId}
                        </p>
                        <Button onClick={() => handleDownloadCertificate(certificate)} className="w-full bg-gray-500 hover:bg-gray-600" size="sm">
                          <Download className="mr-1 h-3 w-3" /> Download Certificate
                        </Button>
                        <p className="text-xs text-gray-400 mt-3 text-center">
                          This certificate remains valid even though the course is archived.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`text-center py-16 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Award className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No certificates yet</h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Complete courses to earn certificates</p>
            <Link href="/courses">
              <Button className="bg-green-700 hover:bg-green-800">Browse Courses</Button>
            </Link>
          </div>
        )}
      </div>

      {/* View Certificate Modal */}
      {showViewModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Certificate Preview</h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CertificateGenerator 
                studentName={user?.name || 'Student'}
                courseName={selectedCertificate.title}
                completionDate={selectedCertificate.completedDate}
                certificateId={selectedCertificate.certificateId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}