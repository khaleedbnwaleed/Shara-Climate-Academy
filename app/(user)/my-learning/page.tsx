'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Award, Clock, ChevronRight, TrendingUp, Calendar, CheckCircle, Star } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

export default function MyLearningPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [allEnrolledCourses, setAllEnrolledCourses] = useState<any[]>([]);
  const [inProgressCourses, setInProgressCourses] = useState<any[]>([]);
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.enrolledCourses && user?.enrolledCourses.length > 0) {
      fetchCourseDetails();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCourseDetails = async () => {
    try {
      // Fetch all enrolled courses from Firebase
      const enrolledPromises = (user?.enrolledCourses || []).map(async (courseId: string) => {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          // Get total lessons count
          const lessonsRef = collection(db, 'courses', courseId, 'lessons');
          const lessonsSnapshot = await getDocs(lessonsRef);
          const totalLessons = lessonsSnapshot.size;
          
          return { 
            id: courseSnap.id, 
            ...courseSnap.data(),
            totalLessons 
          };
        }
        return null;
      });

      const enrolled = (await Promise.all(enrolledPromises)).filter(Boolean);
      setAllEnrolledCourses(enrolled);
      
      // Calculate progress for each course based on localStorage AND Firestore completion
      const progressMap: Record<string, number> = {};
      enrolled.forEach((course: any) => {
        // Check if course is marked as completed in Firestore
        const isCompletedInFirestore = user?.completedCourses?.includes(course.id);
        
        let progress = getProgressForCourse(course.id, course.totalLessons);
        
        // If course is marked completed in Firestore, force progress to 100%
        if (isCompletedInFirestore) {
          progress = 100;
          // Also update localStorage to match
          const totalLessons = course.totalLessons;
          const allLessons = Array.from({ length: totalLessons }, (_, i) => `lesson_${i}`);
          localStorage.setItem(`completed_lessons_${user?.uid}_${course.id}`, JSON.stringify(allLessons));
        }
        
        progressMap[course.id] = progress;
      });
      setCourseProgress(progressMap);
      
      // Split into in-progress and completed based on progress percentage OR Firestore completion
      const inProgress = enrolled.filter(course => {
        const isCompletedInFirestore = user?.completedCourses?.includes(course.id);
        const progress = progressMap[course.id];
        return !isCompletedInFirestore && progress < 100;
      });
      const completed = enrolled.filter(course => {
        const isCompletedInFirestore = user?.completedCourses?.includes(course.id);
        const progress = progressMap[course.id];
        return isCompletedInFirestore || progress === 100;
      });
      
      setInProgressCourses(inProgress);
      setCompletedCourses(completed);
      
    } catch (error) {
      console.error('Error fetching course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressForCourse = (courseId: string, totalLessons: number) => {
    // If no lessons, progress is 0
    if (totalLessons === 0) return 0;
    
    // Get completed lessons from localStorage
    const saved = localStorage.getItem(`completed_lessons_${user?.uid}_${courseId}`);
    const completedLessons = saved ? JSON.parse(saved).length : 0;
    
    // Calculate progress percentage
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const getProgress = (courseId: string) => courseProgress[courseId] || 0;

  // Sync progress to Firestore when a course is completed
  const syncCompletionToFirestore = async (courseId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentCompleted = user?.completedCourses || [];
      if (!currentCompleted.includes(courseId)) {
        await updateDoc(userRef, {
          completedCourses: [...currentCompleted, courseId]
        });
        // Update local user object
        user.completedCourses = [...currentCompleted, courseId];
      }
    } catch (error) {
      console.error('Error syncing completion:', error);
    }
  };

  // Calculate statistics
  const totalHours = allEnrolledCourses.reduce((sum, course) => sum + (course.duration || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            My Learning
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your progress and continue learning
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Summary */}
        {allEnrolledCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Enrolled</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{allEnrolledCourses.length}</p>
                </div>
                <BookOpen className={`h-5 w-5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>In Progress</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{inProgressCourses.length}</p>
                </div>
                <TrendingUp className={`h-5 w-5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{completedCourses.length}</p>
                </div>
                <Award className={`h-5 w-5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Learning Hours</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalHours}</p>
                </div>
                <Clock className={`h-5 w-5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
            <TabsTrigger value="in-progress">
              In Progress ({inProgressCourses.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedCourses.length})
            </TabsTrigger>
          </TabsList>

          {/* In Progress Tab */}
          <TabsContent value="in-progress" className="space-y-4">
            {inProgressCourses.length > 0 ? (
              <div className="space-y-4">
                {inProgressCourses.map((course) => {
                  const progress = getProgress(course.id);
                  const completedLessonsCount = Math.floor((progress / 100) * (course.lessonCount || 0));
                  
                  return (
                    <div key={course.id} className={`group rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-48 h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <img
                            src={course.imageUrl || 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                            <div>
                              <h3 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {course.title}
                              </h3>
                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {course.instructorName || 'Shara Academy'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{course.rating || 4.5}</span>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Progress</span>
                              <span className="font-medium text-green-600">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {completedLessonsCount} of {course.lessonCount || 0} lessons completed
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {course.duration || 0} hours
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" /> {course.lessonCount || 0} lessons
                              </span>
                            </div>
                            <Link href={`/courses/${course.id}`}>
                              <Button size="sm" className="bg-green-700 hover:bg-green-800">
                                Continue
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <BookOpen className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className={`text-base font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No courses in progress</h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enroll in a course to start learning</p>
                <Link href="/courses">
                  <Button size="sm" className="bg-green-700 hover:bg-green-800">Browse Courses</Button>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4">
            {completedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completedCourses.map((course) => (
                  <div key={course.id} className={`group rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={course.imageUrl || 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-2 left-2">
                        <div className="flex items-center gap-1 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" /> Completed
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className={`font-semibold text-sm line-clamp-1 mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {course.title}
                      </h3>
                      <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {course.instructorName || 'Shara Academy'}
                      </p>
                      <div className="flex gap-2">
                        <Link href={`/certificates/${course.id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-green-700 hover:bg-green-800">
                            <Award className="mr-1 h-3 w-3" /> Certificate
                          </Button>
                        </Link>
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Award className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className={`text-base font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No completed courses</h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Complete a course to earn a certificate</p>
                <Link href="/courses">
                  <Button size="sm" className="bg-green-700 hover:bg-green-800">Browse Courses</Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}