'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { 
  Star, Users, Clock, BookOpen, CheckCircle, Video, FileText, 
  Download, File, Image as ImageIcon, Award, 
  ArrowLeft, Banknote, CreditCard, X,
  Lock, AlertTriangle, RotateCcw
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, setDoc, query, where, orderBy } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import { initializePaystackPayment } from '@/lib/paystack';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface Lesson {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'pdf' | 'document' | 'text' | 'image';
  url?: string;
  content?: string;
  completed: boolean;
  isLocked?: boolean;
  watchProgress?: number;
  videoDuration?: number;
}

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [currentLessonProgress, setCurrentLessonProgress] = useState(0);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<{name: string, icon: string} | null>(null);
  const [isSeekingAhead, setIsSeekingAhead] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const playerRef = useRef<any>(null);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalWatchedRef = useRef<number>(0);
  const REQUIRED_WATCH_PERCENTAGE = 85;

  const progress = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;
  const isCompleted = progress === 100;
  const completedCount = completedLessons.length;
  const totalCount = lessons.length;

  const extractYouTubeId = (url: string): string => {
    if (!url) return '';
    let videoUrl = url;
    if (videoUrl.includes('<iframe')) {
      const srcMatch = videoUrl.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) videoUrl = srcMatch[1];
    }
    videoUrl = videoUrl.split('?')[0];
    if (videoUrl.includes('youtu.be/')) return videoUrl.split('youtu.be/')[1];
    if (videoUrl.includes('youtube.com/embed/')) return videoUrl.split('embed/')[1];
    if (videoUrl.includes('youtube.com/watch?v=')) return videoUrl.split('v=')[1];
    return '';
  };

  useEffect(() => {
    if (!document.querySelector('#youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    fetchCourseDetails();
    loadProgress();
    checkEnrollment();
    loadAchievements();
    loadTotalWatchTime();
  }, [courseId]);

  useEffect(() => {
    if (isEnrolled && course) fetchLessons();
  }, [isEnrolled, course]);

  useEffect(() => {
    if (progress === 100 && isEnrolled && !user?.completedCourses?.includes(courseId)) {
      markCourseCompleted();
    }
  }, [progress, isEnrolled]);

  // YouTube Player - NO AUTO-PLAY (user must click play)
  useEffect(() => {
    if (!currentLesson || currentLesson.type !== 'video') {
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
      return;
    }
    
    if (currentLesson.isLocked) {
      return;
    }
    
    const videoId = extractYouTubeId(currentLesson.url || '');
    if (!videoId) return;
    
    totalWatchedRef.current = getStoredWatchTime(currentLesson.id);
    setIsTransitioning(false);
    
    const loadPlayer = () => {
      if (window.YT && window.YT.Player) {
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            // Ignore
          }
          playerRef.current = null;
        }
        
        const playerDiv = document.getElementById(`youtube-player-${currentLesson.id}`);
        if (playerDiv) {
          playerRef.current = new window.YT.Player(playerDiv, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 
              controls: 1,
              rel: 0,
              modestbranding: 1,
              showinfo: 0,
              iv_load_policy: 3,
              fs: 1,
              autoplay: 0,        // ✅ NO AUTO-PLAY
              playsinline: 1
            },
            events: {
              onReady: (event) => {
                const duration = event.target.getDuration();
                const savedProgress = getStoredProgress(currentLesson.id);
                if (savedProgress > 0 && savedProgress < 100) {
                  event.target.seekTo((savedProgress / 100) * duration, true);
                }
                setCurrentLessonProgress(savedProgress);
                // ✅ DO NOT auto-play here
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING && playerRef.current) {
                  const currentTime = playerRef.current.getCurrentTime() || 0;
                  const duration = playerRef.current.getDuration() || 1;
                  const expectedTime = (totalWatchedRef.current / 100) * duration;
                  
                  if (currentTime > expectedTime + 3 && totalWatchedRef.current > 0) {
                    setIsSeekingAhead(true);
                    setTimeout(() => setIsSeekingAhead(false), 3000);
                  }
                }

                if (event.data === window.YT.PlayerState.PLAYING) {
                  let lastTime = Date.now();
                  if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
                  
                  watchIntervalRef.current = setInterval(() => {
                    if (playerRef.current && playerRef.current.getCurrentTime) {
                      const now = Date.now();
                      const elapsed = (now - lastTime) / 1000;
                      lastTime = now;
                      
                      if (elapsed > 0 && elapsed < 3) {
                        totalWatchedRef.current += elapsed;
                        const duration = playerRef.current.getDuration();
                        if (duration && duration > 0) {
                          const percent = Math.min((totalWatchedRef.current / duration) * 100, 100);
                          setCurrentLessonProgress(percent);
                          storeWatchTime(currentLesson.id, totalWatchedRef.current);
                          storeProgress(currentLesson.id, percent);
                          
                          if (percent >= REQUIRED_WATCH_PERCENTAGE && !completedLessons.includes(currentLesson.id)) {
                            markLessonComplete(currentLesson.id);
                          }
                        }
                      }
                    }
                  }, 1000);
                } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                  if (watchIntervalRef.current) {
                    clearInterval(watchIntervalRef.current);
                    watchIntervalRef.current = null;
                  }
                  storeWatchTime(currentLesson.id, totalWatchedRef.current);
                }
              }
            }
          });
        }
      } else {
        window.onYouTubeIframeAPIReady = loadPlayer;
      }
    };
    
    setTimeout(loadPlayer, 100);
    
    return () => {
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore
        }
        playerRef.current = null;
      }
    };
  }, [currentLesson]);

  const getStoredWatchTime = (lessonId: string): number => {
    const saved = localStorage.getItem(`watch_${user?.uid}_${courseId}_${lessonId}`);
    return saved ? parseFloat(saved) : 0;
  };
  
  const storeWatchTime = (lessonId: string, time: number) => {
    localStorage.setItem(`watch_${user?.uid}_${courseId}_${lessonId}`, time.toString());
  };
  
  const getStoredProgress = (lessonId: string): number => {
    const saved = localStorage.getItem(`progress_${user?.uid}_${courseId}_${lessonId}`);
    return saved ? parseFloat(saved) : 0;
  };
  
  const storeProgress = (lessonId: string, progress: number) => {
    localStorage.setItem(`progress_${user?.uid}_${courseId}_${lessonId}`, progress.toString());
  };

  const loadAchievements = () => {
    const saved = localStorage.getItem(`achievements_${user?.uid}_${courseId}`);
    if (saved) setAchievements(JSON.parse(saved));
  };

  const loadTotalWatchTime = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`watch_${user?.uid}_${courseId}_`)) {
        total += parseFloat(localStorage.getItem(key) || '0');
      }
    }
    setTotalWatchTime(Math.floor(total));
  };

  const checkAchievements = (count: number) => {
    const total = lessons.length;
    let achievement = null;
    if (count === 1 && !achievements.includes('First Steps')) achievement = { name: 'First Steps', icon: '🌱' };
    else if (count === Math.ceil(total * 0.5) && !achievements.includes('Half Way There')) achievement = { name: 'Half Way There', icon: '📊' };
    else if (count === Math.ceil(total * 0.75) && !achievements.includes('Almost There')) achievement = { name: 'Almost There', icon: '🎯' };
    else if (count === total && !achievements.includes('Course Master')) achievement = { name: 'Course Master', icon: '🏆' };
    
    if (achievement) {
      setShowAchievement(achievement);
      setTimeout(() => setShowAchievement(null), 5000);
      const newAchievements = [...achievements, achievement.name];
      setAchievements(newAchievements);
      localStorage.setItem(`achievements_${user?.uid}_${courseId}`, JSON.stringify(newAchievements));
    }
  };

  const unlockNextLesson = (currentLessonId: string) => {
    const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
    const nextLesson = lessons[currentIndex + 1];
    if (nextLesson && nextLesson.isLocked) {
      setLessons(prev => prev.map(lesson =>
        lesson.id === nextLesson.id ? { ...lesson, isLocked: false } : lesson
      ));
      localStorage.setItem(`unlocked_${user?.uid}_${courseId}_${nextLesson.id}`, 'true');
    }
  };

  const checkEnrollment = () => {
    setIsEnrolled(user?.enrolledCourses?.includes(courseId) || false);
  };

  const fetchCourseDetails = async () => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) setCourse({ id: courseSnap.id, ...courseSnap.data() });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoadingLessons(true);
      
      const lessonsQ = query(
        collection(db, 'lessons'),
        where('courseId', '==', courseId),
        orderBy('order', 'asc')
      );
      const lessonsSnapshot = await getDocs(lessonsQ);
      
      const lessonsData = lessonsSnapshot.docs.map((doc, index) => {
        const data = doc.data();
        const isCompleted = completedLessons.includes(doc.id);
        const isLocked = index > 0 && !completedLessons.includes(lessonsSnapshot.docs[index - 1].id);
        const manuallyUnlocked = localStorage.getItem(`unlocked_${user?.uid}_${courseId}_${doc.id}`) === 'true';
        
        return {
          id: doc.id,
          title: data.title || 'Untitled Lesson',
          duration: data.duration || 0,
          type: data.type || 'video',
          url: data.content || '',
          content: data.content || '',
          completed: isCompleted,
          isLocked: isLocked && !manuallyUnlocked && !isCompleted,
          watchProgress: getStoredProgress(doc.id)
        };
      });
      
      setLessons(lessonsData);
      console.log('Lessons loaded from root collection:', lessonsData.length);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  const loadProgress = () => {
    const saved = localStorage.getItem(`completed_${user?.uid}_${courseId}`);
    if (saved) setCompletedLessons(JSON.parse(saved));
  };

  const saveProgress = (list: string[]) => {
    localStorage.setItem(`completed_${user?.uid}_${courseId}`, JSON.stringify(list));
    setCompletedLessons(list);
    setLessons(prev => prev.map(lesson => ({ ...lesson, completed: list.includes(lesson.id) })));
  };

  // Get the next uncompleted lesson
  const getNextLesson = () => {
    return lessons.find(l => !completedLessons.includes(l.id) && !l.isLocked) || null;
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!completedLessons.includes(lessonId) && !isTransitioning) {
      setIsTransitioning(true);
      const updated = [...completedLessons, lessonId];
      saveProgress(updated);
      checkAchievements(updated.length);
      unlockNextLesson(lessonId);
      
      if (user) {
        const progressRef = doc(db, 'users', user.uid, 'courseProgress', courseId);
        try {
          await updateDoc(progressRef, { completedLessons: updated, lastUpdated: new Date() });
        } catch {
          await setDoc(progressRef, { completedLessons: updated, courseId, startedAt: new Date() });
        }
      }
      
      await fetchLessons();
      
      // Find the next lesson
      const nextLesson = lessons.find(l => !updated.includes(l.id) && !l.isLocked);
      
      if (nextLesson) {
        // Show "Next lesson coming" toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 z-50 animate-slide-up bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-blue-400 max-w-sm';
        toast.innerHTML = `
          <div class="flex items-center gap-4">
            <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            <div>
              <p class="font-semibold text-sm">Next lesson coming...</p>
              <p class="text-xs opacity-90">"${nextLesson.title}" loading</p>
            </div>
          </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
          setCurrentLesson(nextLesson);
          setActiveTab('lessons');
          setIsTransitioning(false);
          
          const successToast = document.createElement('div');
          successToast.className = 'fixed bottom-4 right-4 z-50 animate-slide-up bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg';
          successToast.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="text-xl">▶️</span>
              <div>
                <p class="font-semibold text-sm">Ready to watch</p>
                <p class="text-xs opacity-90">${nextLesson.title}</p>
              </div>
            </div>
          `;
          document.body.appendChild(successToast);
          setTimeout(() => successToast.remove(), 3000);
        }, 1500);
        
      } else {
        setIsTransitioning(false);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.innerText = '🎉 All lessons completed!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    }
  };

  const markCourseCompleted = async () => {
    if (!user) return;
    try {
      const updatedCompleted = [...(user.completedCourses || []), courseId];
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { completedCourses: updatedCompleted });
      user.completedCourses = updatedCompleted;
      
      const completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const certificateId = `${courseId.slice(0, 8)}-${user.uid.slice(0, 8)}`;
      
      localStorage.setItem(`certificate_${user.uid}_${courseId}`, JSON.stringify({
        courseId, courseTitle: course?.title, completedDate: completionDate, certificateId
      }));
      
      setShowCertificate(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // "Continue Learning" - switches to next lesson (no auto-play)
  const handleContinueLearning = () => {
    let nextLesson = getNextLesson();
    
    if (!nextLesson) {
      const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
      
      if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
        nextLesson = lessons[currentIndex + 1];
      } else if (currentIndex === lessons.length - 1) {
        nextLesson = lessons[0];
      } else if (lessons.length > 0) {
        nextLesson = lessons[0];
      }
    }
    
    if (nextLesson) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 z-50 animate-slide-up bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-blue-400 max-w-sm';
      toast.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          <div>
            <p class="font-semibold text-sm">Loading next lesson...</p>
            <p class="text-xs opacity-90">"${nextLesson.title}"</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      
      setCurrentLesson(null);
      setTimeout(() => {
        toast.remove();
        setCurrentLesson(nextLesson);
        setActiveTab('lessons');
      }, 800);
    } else {
      setActiveTab('lessons');
    }
  };

  const handleFreeEnroll = async () => {
    if (!user) return;
    try {
      const updatedEnrolled = [...(user.enrolledCourses || []), courseId];
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { enrolledCourses: updatedEnrolled });
      user.enrolledCourses = updatedEnrolled;
      setIsEnrolled(true);
      await fetchLessons();
    } catch (error) {
      alert('Failed to enroll');
    }
  };

  const handlePaystackPayment = async () => {
    if (!user) { alert('Please login'); return; }
    setProcessingPayment(true);
    try {
      const paymentResponse = await initializePaystackPayment({
        amount: course.price, email: user.email, name: user.name,
        courseId: course.id, courseTitle: course.title, coursePrice: course.price,
      });
      if (paymentResponse) {
        const verifyResponse = await fetch('/api/payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: (paymentResponse as any).reference, amount: course.price,
            courseId: course.id, userId: user.uid, email: user.email, courseTitle: course.title,
          }),
        });
        const result = await verifyResponse.json();
        if (result.success) {
          alert('Payment successful!');
          setIsEnrolled(true);
          await fetchLessons();
          user.enrolledCourses = [...(user.enrolledCourses || []), courseId];
          setShowPaymentModal(false);
        } else alert('Payment verification failed');
      }
    } catch (error) {
      alert('Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleBankTransfer = () => {
    setShowPaymentModal(false);
    router.push(`/payment/bank-transfer?courseId=${courseId}`);
  };

  const handleEnroll = () => {
    if (!user) { alert('Please login'); return; }
    if (course.price === 0) handleFreeEnroll();
    else setShowPaymentModal(true);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5 text-blue-500" />;
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'document': return <File className="h-5 w-5 text-orange-500" />;
      case 'image': return <ImageIcon className="h-5 w-5 text-purple-500" />;
      default: return <BookOpen className="h-5 w-5 text-green-500" />;
    }
  };

  const renderLessonContent = (lesson: Lesson) => {
    if (lesson.isLocked) {
      return (
        <div className="rounded-xl p-12 text-center bg-gray-50 dark:bg-gray-800">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Lesson Locked</h3>
          <p className="text-gray-500">Complete the previous lesson to unlock this one.</p>
        </div>
      );
    }

    if (lesson.type === 'video') {
      const isCompleted = completedLessons.includes(lesson.id);
      const progressPercent = Math.round(currentLessonProgress);

      return (
        <div className="space-y-4">
          <div 
            id={`youtube-player-${lesson.id}`} 
            className="aspect-video bg-black rounded-xl overflow-hidden min-h-[250px] sm:min-h-[300px] md:min-h-[400px]" 
          />
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <span className="text-sm text-gray-500">{progressPercent}% watched</span>
          </div>

          {isSeekingAhead && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Please watch the video without skipping ahead to mark it complete.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {/* Replay Button - still works */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (playerRef.current && playerRef.current.seekTo) {
                  playerRef.current.seekTo(0, true);
                  if (playerRef.current.playVideo) {
                    playerRef.current.playVideo();
                  }
                }
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Replay
            </Button>

            {!isCompleted && progressPercent >= REQUIRED_WATCH_PERCENTAGE && !isTransitioning && (
              <Button 
                onClick={() => markLessonComplete(lesson.id)} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <CheckCircle className="h-4 w-4" /> Mark Complete
              </Button>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
                <CheckCircle className="h-4 w-4" /> Completed
              </span>
            )}
          </div>

          {!isCompleted && progressPercent < REQUIRED_WATCH_PERCENTAGE && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Watch at least {REQUIRED_WATCH_PERCENTAGE}% of the video to mark it complete.
              </p>
            </div>
          )}
        </div>
      );
    }
    
    if (lesson.type === 'pdf') {
      return (
        <div className="rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-800">
          <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">PDF Document</h3>
          <p className="text-gray-600 mb-6">Download and read the PDF to complete this lesson</p>
          <a href={lesson.url} download>
            <Button className="bg-red-600"><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
          </a>
          {!completedLessons.includes(lesson.id) && (
            <Button onClick={() => markLessonComplete(lesson.id)} variant="outline" className="ml-3">
              <CheckCircle className="mr-2 h-4 w-4" /> Mark as Read
            </Button>
          )}
        </div>
      );
    }
    
    return (
      <div className="rounded-xl p-6 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Lesson Content</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{lesson.content}</p>
        {!completedLessons.includes(lesson.id) && (
          <Button onClick={() => markLessonComplete(lesson.id)} className="mt-4 bg-green-600">
            <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete
          </Button>
        )}
      </div>
    );
  };

  const AchievementPopup = () => {
    if (!showAchievement) return null;
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-bounce">
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3">
          <span className="text-3xl">{showAchievement.icon}</span>
          <div>
            <p className="text-xs font-semibold">ACHIEVEMENT UNLOCKED!</p>
            <p className="font-bold">{showAchievement.name}</p>
          </div>
        </div>
      </div>
    );
  };

  const CertificateModal = () => {
    if (!showCertificate) return null;
    
    const savedCertData = localStorage.getItem(`certificate_${user?.uid}_${courseId}`);
    let certTitle = course?.title;
    let completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let certificateId = `${courseId.slice(0, 8)}-${user?.uid?.slice(0, 8)}`;
    
    if (savedCertData) {
      const data = JSON.parse(savedCertData);
      certTitle = data.courseTitle;
      completionDate = data.completedDate;
      certificateId = data.certificateId;
    }

    const handleDownload = async () => {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.innerText = 'Generating certificate...';
      document.body.appendChild(toast);
      
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
          ctx.drawImage(img, 0, 0);
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
          ctx.fillText(`Certificate ID: ${certificateId}`, centerX, 1060);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `certificate-${certTitle.replace(/\s/g, '-')}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        }
      } catch (error) {
        alert('Failed to generate certificate');
      } finally {
        toast.remove();
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-8 relative">
          <button onClick={() => setShowCertificate(false)} className="absolute top-4 right-4 text-gray-400">X</button>
          <div className="text-center">
            <Award className="h-20 w-20 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
            <p className="text-gray-600 mb-4">You've successfully completed the course</p>
            <h3 className="text-2xl font-bold text-green-700 mb-6">{certTitle}</h3>
            <div className="rounded-lg p-6 mb-6 bg-gray-50 dark:bg-gray-700">
              <p className="text-gray-600 mb-2">Certificate awarded to</p>
              <p className="text-xl font-bold text-blue-700">{user?.name}</p>
              <p className="text-sm text-gray-500 mt-4">Completed on {completionDate}</p>
              <p className="text-xs text-gray-400 mt-2">ID: {certificateId}</p>
            </div>
            <Button onClick={handleDownload} className="bg-green-700">
              <Download className="mr-2 h-4 w-4" /> Download Certificate
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const PaymentModal = () => {
    if (!showPaymentModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 relative">
          <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-gray-400">X</button>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Choose Payment Method</h2>
            <p className="text-gray-500 mt-2">Course: {course?.title}</p>
            <p className="text-xl font-bold text-green-600 mt-2">₦{course?.price?.toLocaleString()}</p>
          </div>
          <div className="space-y-3">
            <button onClick={handlePaystackPayment} disabled={processingPayment} className="w-full p-4 border-2 rounded-xl hover:border-green-500 transition">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">Pay with Card (Paystack)</p>
                  <p className="text-sm text-gray-500">Secure payment via card, USSD, or bank transfer</p>
                </div>
              </div>
            </button>
            <button onClick={handleBankTransfer} className="w-full p-4 border-2 rounded-xl hover:border-green-500 transition">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">Manual Bank Transfer</p>
                  <p className="text-sm text-gray-500">Pay directly to our bank account</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
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
      <div className="flex-1 p-8 text-center">
        <Card>
          <CardContent className="py-8">
            <p className="text-gray-600">Course not found</p>
            <Link href="/courses"><Button className="mt-4">Back to Courses</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <AchievementPopup />
      <CertificateModal />
      <PaymentModal />
      
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img src={course.imageUrl || '/course-bg.jpg'} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{course.title}</h1>
          <p className="text-sm opacity-90 max-w-2xl">{course.description?.substring(0, 150)}...</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex gap-6 border-b mb-6">
              <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}>
                Overview
              </button>
              {isEnrolled && (
                <button onClick={() => setActiveTab('lessons')} className={`pb-3 text-sm font-medium ${activeTab === 'lessons' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}>
                  Lessons ({lessons.length})
                </button>
              )}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <p className="text-gray-600 dark:text-gray-400">{course.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-green-600" /> {course.duration || 0} hours total</div>
                  <div className="flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4 text-green-600" /> {lessons.length} lessons</div>
                  <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-green-600" /> {course.totalStudents || 0} students</div>
                  <div className="flex items-center gap-2 text-sm"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {course.rating || 4.5} rating</div>
                </div>
              </div>
            )}

            {activeTab === 'lessons' && isEnrolled && (
              <div>
                {loadingLessons ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
                ) : currentLesson ? (
                  <div>
                    <button onClick={() => setCurrentLesson(null)} className="text-green-600 mb-4 flex items-center gap-1 text-sm">
                      <ArrowLeft className="h-4 w-4" /> Back to lessons
                    </button>
                    <div className="rounded-xl border bg-white dark:bg-gray-800">
                      <div className="p-6 border-b">
                        <div className="flex items-center gap-3">
                          {getContentIcon(currentLesson.type)}
                          <h3 className="text-xl font-semibold">{currentLesson.title}</h3>
                        </div>
                      </div>
                      <div className="p-6">{renderLessonContent(currentLesson)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => (
                      <div key={lesson.id} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${completedLessons.includes(lesson.id) ? 'border-green-200 bg-green-50' : lesson.isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={() => !lesson.isLocked && setCurrentLesson(lesson)}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${completedLessons.includes(lesson.id) ? 'bg-green-100 text-green-600' : lesson.isLocked ? 'bg-gray-300' : 'bg-gray-100'}`}>
                            {completedLessons.includes(lesson.id) ? <CheckCircle className="h-4 w-4" /> : lesson.isLocked ? <Lock className="h-3 w-3" /> : <span className="text-sm">{index + 1}</span>}
                          </div>
                          <div>
                            <h3 className="font-medium">{lesson.title}{lesson.isLocked && <span className="text-xs ml-2">(Locked)</span>}</h3>
                            <div className="text-xs text-gray-500">{lesson.duration} min • {lesson.type}</div>
                          </div>
                        </div>
                        {!lesson.isLocked && <Button variant="outline" size="sm">{completedLessons.includes(lesson.id) ? 'Review' : 'Start'}</Button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-xl border p-5 bg-white dark:bg-gray-800">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-green-600">{course.price === 0 ? 'Free' : `₦${course.price}`}</span>
                </div>
                {!isEnrolled ? (
                  <Button onClick={handleEnroll} className="w-full bg-green-700">Enroll Now</Button>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span className="font-semibold text-green-600">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-2">{completedCount} of {totalCount} lessons</p>
                    </div>
                    {isCompleted ? (
                      <Link href={`/certificates/${courseId}`}>
                        <Button className="w-full bg-purple-600"><Award className="mr-2 h-4 w-4" /> View Certificate</Button>
                      </Link>
                    ) : (
                      <Button 
                        onClick={handleContinueLearning} 
                        className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        {completedCount > 0 ? 'Continue Learning' : 'Start Learning'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}