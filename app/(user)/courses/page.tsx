'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Star, Users, Clock, BookOpen, ChevronDown, X, Award, Hourglass, CheckCircle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

const PAGE_SIZE = 12;

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLevelFilter, setShowLevelFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [pendingCourseIds, setPendingCourseIds] = useState<Set<string>>(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
  const [courseProgress, setCourseProgress] = useState<Map<string, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCourseRef = useRef<HTMLDivElement | null>(null);

  const levels = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  // Fetch pending payments for current user
  const fetchPendingPayments = useCallback(async () => {
    if (!user) return;
    
    try {
      const paymentsRef = collection(db, 'paymentRequests');
      const q = query(
        paymentsRef,
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      const pendingIds = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.courseId) {
          pendingIds.add(data.courseId);
        }
      });
      
      setPendingCourseIds(pendingIds);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  }, [user]);

  // Fetch completed courses and progress from localStorage
  const fetchCompletedCourses = useCallback(() => {
    if (!user) return;
    
    const completedIds = new Set<string>();
    const progressMap = new Map<string, number>();
    
    // Check each course completion from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key === `certificate_${user.uid}_`) {
        // This pattern doesn't work directly, need to check each course
      }
    }
    
    // Better approach: check completed lessons for each course
    // For now, use user.completedCourses from Firestore
    if (user.completedCourses) {
      user.completedCourses.forEach(courseId => {
        completedIds.add(courseId);
      });
    }
    
    // Also check localStorage for certificate data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`certificate_${user.uid}_`)) {
        const certData = JSON.parse(localStorage.getItem(key) || '{}');
        if (certData.courseId) {
          completedIds.add(certData.courseId);
        }
      }
    }
    
    setCompletedCourseIds(completedIds);
  }, [user]);

  // Get course progress from localStorage
  const getCourseProgress = (courseId: string): number => {
    if (!user) return 0;
    
    const saved = localStorage.getItem(`completed_lessons_${user.uid}_${courseId}`);
    if (!saved) return 0;
    
    const completedLessons = JSON.parse(saved);
    // We need total lessons count - this will be updated when we fetch course details
    return completedLessons.length;
  };

  // Check if course is completed
  const isCourseCompleted = (courseId: string): boolean => {
    return completedCourseIds.has(courseId);
  };

  // Fetch initial courses
  const fetchCourses = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && !hasMore) return;
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      let constraints: any[] = [
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      ];
      
      if (lastDoc && isLoadMore) {
        constraints = [
          where('isPublished', '==', true),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        ];
      }
      
      const q = query(collection(db, 'courses'), ...constraints);
      const snapshot = await getDocs(q);
      
      const newCourses = snapshot.docs.map(doc => {
        const data = doc.data();
        // Calculate progress for this course
        const savedProgress = localStorage.getItem(`completed_lessons_${user?.uid}_${doc.id}`);
        let progress = 0;
        let totalLessons = data.lessonCount || 0;
        
        if (savedProgress && totalLessons > 0) {
          const completed = JSON.parse(savedProgress);
          progress = Math.round((completed.length / totalLessons) * 100);
        }
        
        return {
          id: doc.id,
          ...data,
          level: data.level || 'beginner',
          progress: progress,
          totalLessons: totalLessons,
          isCompleted: user?.completedCourses?.includes(doc.id) || false
        };
      });
      
      if (isLoadMore) {
        setCourses(prev => [...prev, ...newCourses]);
      } else {
        setCourses(newCourses);
        
        // Extract unique categories from all courses
        const allCourses = await getDocs(collection(db, 'courses'));
        const uniqueCategories = [...new Set(allCourses.docs.map(d => d.data().category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
      
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc, hasMore, user]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
        fetchCourses(true);
      }
    });
    
    if (lastCourseRef.current) {
      observerRef.current.observe(lastCourseRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, courses.length, fetchCourses]);

  useEffect(() => {
    fetchCourses(false);
    fetchPendingPayments();
    fetchCompletedCourses();
  }, [fetchCourses, fetchPendingPayments, fetchCompletedCourses]);

  // Check if user is enrolled in a course
  const isEnrolled = (courseId: string) => {
    return user?.enrolledCourses?.includes(courseId) || false;
  };

  // Check if payment is pending
  const isPending = (courseId: string) => {
    return pendingCourseIds.has(courseId) && !isEnrolled(courseId);
  };

  // Filter courses client-side (after pagination)
  const filteredCourses = courses.filter(course => {
    const matchesSearch = searchTerm === '' || 
                          course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    return matchesSearch && matchesLevel && matchesCategory;
  });

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedLevel('all');
    setSelectedCategory('all');
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Explore Courses
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Discover climate courses from expert instructors
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Search courses by title, topic, or instructor..." 
              className={`pl-10 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`} 
            />
          </div>
          
          <div className="flex gap-3">
            {/* Level Filter Dropdown */}
            <div className="relative">
              <Button 
                variant="outline" 
                onClick={() => setShowLevelFilter(!showLevelFilter)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {levels.find(l => l.value === selectedLevel)?.label || 'All Levels'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showLevelFilter ? 'rotate-180' : ''}`} />
              </Button>
              
              {showLevelFilter && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLevelFilter(false)} />
                  <div className={`absolute top-full mt-2 right-0 z-50 rounded-lg shadow-lg border overflow-hidden min-w-[160px] ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    {levels.map(level => (
                      <button
                        key={level.value}
                        onClick={() => {
                          setSelectedLevel(level.value);
                          setShowLevelFilter(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedLevel === level.value 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' 
                            : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category Filter Dropdown */}
            {categories.length > 0 && (
              <div className="relative">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} />
                </Button>
                
                {showCategoryFilter && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCategoryFilter(false)} />
                    <div className={`absolute top-full mt-2 right-0 z-50 rounded-lg shadow-lg border overflow-hidden min-w-[180px] ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setShowCategoryFilter(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedCategory === 'all' 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' 
                            : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        All Categories
                      </button>
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setShowCategoryFilter(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            selectedCategory === category 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' 
                              : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Tags */}
        {(searchTerm || selectedLevel !== 'all' || selectedCategory !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500">Active Filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedLevel !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                {levels.find(l => l.value === selectedLevel)?.label}
                <button onClick={() => setSelectedLevel('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button 
              onClick={clearAllFilters}
              className="text-sm text-red-600 hover:text-red-700 ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filter Stats */}
        <div className="flex justify-between items-center mb-6">
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing <span className="font-semibold">{filteredCourses.length}</span> courses
          </p>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => {
              const enrolled = isEnrolled(course.id);
              const pending = isPending(course.id);
              const completed = course.isCompleted || isCourseCompleted(course.id);
              
              return (
                <div 
                  key={course.id} 
                  ref={index === filteredCourses.length - 1 ? lastCourseRef : null}
                >
                  <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } ${completed ? 'border-green-500 ring-1 ring-green-500' : ''}`}>
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        src={course.imageUrl || 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'} 
                        alt={course.title} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      {/* Status Badge - Top Right */}
                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                        {completed ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-500 text-white flex items-center gap-1">
                            <Award className="h-3 w-3" /> Completed
                          </span>
                        ) : enrolled ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500 text-white flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> In Progress
                          </span>
                        ) : pending && !enrolled ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-500 text-white flex items-center gap-1">
                            <Hourglass className="h-3 w-3" /> Pending
                          </span>
                        ) : null}
                      </div>
                      
                      {/* Level Badge - Top Left */}
                      <div className="absolute top-2 left-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                          course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {course.level === 'beginner' ? 'Beginner' :
                           course.level === 'intermediate' ? 'Intermediate' : 'Advanced'}
                        </span>
                      </div>
                      
                      {/* Completed Overlay */}
                      {completed && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="bg-green-500 rounded-full p-2">
                            <Award className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-5">
                      <h3 className={`font-semibold text-lg line-clamp-1 mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {course.title}
                      </h3>
                      <p className={`text-sm line-clamp-2 mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {course.description}
                      </p>
                      
                      {/* Progress Bar for enrolled but not completed courses */}
                      {enrolled && !completed && course.progress > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-600 rounded-full transition-all duration-300"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-3 mb-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{course.rating || 4.5}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span>{course.totalStudents || 0} students</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span>{course.duration || 0} hours</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div>
                          {course.price === 0 ? (
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">Free</span>
                          ) : (
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">₦{course.price}</span>
                          )}
                        </div>
                        
                        {completed ? (
                          <Link href={`/certificates/${course.id}`}>
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                              <Award className="h-3 w-3 mr-1" /> View Certificate
                            </Button>
                          </Link>
                        ) : enrolled ? (
                          <Link href={`/courses/${course.id}`}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Continue
                            </Button>
                          </Link>
                        ) : pending ? (
                          <Button size="sm" disabled className="bg-yellow-500 opacity-75 cursor-not-allowed">
                            <Hourglass className="h-3 w-3 mr-1" /> Pending
                          </Button>
                        ) : (
                          <Link href={`/courses/${course.id}`}>
                            <Button size="sm" className="bg-green-700 hover:bg-green-800">
                              Enroll Now
                            </Button>
                          </Link>
                        )}
                      </div>
                      
                      {/* Pending Info Message */}
                      {pending && !enrolled && !completed && (
                        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                          <p className="text-xs text-yellow-800 dark:text-yellow-400">
                            Your bank transfer is being verified. You'll get access within 24 hours.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className={`text-center py-16 ${isDarkMode ? 'bg-gray-800' : ''}`}>
            <CardContent>
              <Award className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                No courses found
              </h3>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Try adjusting your search or filters to find what you're looking for
              </p>
              {(searchTerm || selectedLevel !== 'all' || selectedCategory !== 'all') && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}