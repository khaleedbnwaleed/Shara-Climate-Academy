'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen, X, Loader2, Trash2, Video, FileText, Clock, Play,
  File, ArrowLeft, Users, Star, Plus, DollarSign
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

interface CourseUser {
  id: string;
  role?: string;
  enrolledCourses?: string[];
  [key: string]: unknown;
}

interface Lesson {
  id: string;
  title?: string;
  moduleTitle?: string;
  duration?: number;
  type?: 'video' | 'pdf' | 'text' | string;
  url?: string;
}

interface Course {
  id: string;
  title?: string;
  lessonCount?: number;
  rating?: number;
  price?: number;
  [key: string]: unknown;
}

export default function CourseManagePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [contentType, setContentType] = useState<'video' | 'pdf' | 'text'>('video');
  const [lessonDuration, setLessonDuration] = useState(0);
  const [lessonContent, setLessonContent] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [allStudents, setAllStudents] = useState<CourseUser[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    if (!courseId) return;

    void fetchCourseData();
    void fetchLessons();
    void fetchStudents();
  }, [courseId]);

  const showNotification = (
    type: 'success' | 'error',
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCourseData = async () => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);

      if (courseSnap.exists()) {
        setCourse({
          id: courseSnap.id,
          ...courseSnap.data()
        } as Course);
      } else {
        setCourse(null);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      showNotification('error', 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const students: CourseUser[] = usersSnapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data()
        }) as CourseUser)
        .filter(
          (u) => u.role === 'student' || u.role === 'professional'
        );

      setAllStudents(students);

      const enrolled = students.filter(
        (student) => student.enrolledCourses?.includes(courseId)
      ).length;

      setStudentCount(enrolled);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoadingLessons(true);

      const lessonsRef = collection(db, 'courses', courseId, 'lessons');
      const lessonsSnapshot = await getDocs(lessonsRef);

      const lessonsData: Lesson[] = lessonsSnapshot.docs.map(
        (lessonDoc) => ({
          id: lessonDoc.id,
          ...lessonDoc.data()
        }) as Lesson
      );

      setLessons(lessonsData);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      showNotification('error', 'Failed to load lessons');
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleAddLesson = async () => {
    if (!moduleTitle.trim() || !lessonTitle.trim()) {
      showNotification('error', 'Please fill in all fields');
      return;
    }

    try {
      const lessonsRef = collection(db, 'courses', courseId, 'lessons');

      await addDoc(lessonsRef, {
        title: lessonTitle.trim(),
        moduleTitle: moduleTitle.trim(),
        duration: lessonDuration,
        type: contentType,
        url: lessonContent.trim(),
        createdAt: new Date()
      });

      await fetchLessons();

      const newLessonCount = lessons.length + 1;

      await updateDoc(doc(db, 'courses', courseId), {
        lessonCount: newLessonCount
      });

      setCourse((currentCourse) =>
        currentCourse
          ? { ...currentCourse, lessonCount: newLessonCount }
          : currentCourse
      );

      setModuleTitle('');
      setLessonTitle('');
      setLessonDuration(0);
      setLessonContent('');
      setContentType('video');
      setShowAddLesson(false);

      showNotification('success', 'Lesson added successfully!');
    } catch (error) {
      console.error('Error adding lesson:', error);
      showNotification('error', 'Failed to add lesson');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;

    try {
      await deleteDoc(
        doc(db, 'courses', courseId, 'lessons', lessonId)
      );

      await fetchLessons();

      const newLessonCount = Math.max(0, lessons.length - 1);

      await updateDoc(doc(db, 'courses', courseId), {
        lessonCount: newLessonCount
      });

      setCourse((currentCourse) =>
        currentCourse
          ? { ...currentCourse, lessonCount: newLessonCount }
          : currentCourse
      );

      showNotification('success', 'Lesson deleted');
    } catch (error) {
      console.error('Error deleting lesson:', error);
      showNotification('error', 'Failed to delete lesson');
    }
  };

  const getContentIcon = (type?: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Course not found</p>
        <Button
          onClick={() => router.push('/lecturer/courses')}
          className="mt-3"
        >
          Back to Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm">
          <div
            className={`rounded-lg shadow-lg p-3 flex items-center gap-2 text-sm ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            <p>{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/lecturer/courses')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div>
          <h1
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {course.title || 'Untitled Course'}
          </h1>
          <p
            className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Manage course content and lessons
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`p-4 text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : ''
          }`}
        >
          <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {studentCount}
          </p>
          <p className="text-xs text-gray-500">Students Enrolled</p>
        </Card>

        <Card
          className={`p-4 text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : ''
          }`}
        >
          <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {course.lessonCount ?? lessons.length}
          </p>
          <p className="text-xs text-gray-500">Total Lessons</p>
        </Card>

        <Card
          className={`p-4 text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : ''
          }`}
        >
          <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {course.rating ?? 4.5}
          </p>
          <p className="text-xs text-gray-500">Rating</p>
        </Card>

        <Card
          className={`p-4 text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : ''
          }`}
        >
          <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            ₦{course.price ?? 0}
          </p>
          <p className="text-xs text-gray-500">Price</p>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2
          className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Lessons
        </h2>

        <Button
          onClick={() => setShowAddLesson(true)}
          className="bg-green-700 hover:bg-green-800"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Lesson
        </Button>
      </div>

      {loadingLessons ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : lessons.length > 0 ? (
        <div className="space-y-3">
          {lessons.map((lesson, idx) => (
            <Card
              key={lesson.id}
              className={`p-4 ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getContentIcon(lesson.type)}
                    <span className="text-xs font-medium text-gray-500">
                      {lesson.moduleTitle || 'General'}
                    </span>
                  </div>

                  <p
                    className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {idx + 1}. {lesson.title || 'Untitled Lesson'}
                  </p>

                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.duration ?? 0} min
                    </span>
                    <span className="capitalize">
                      {lesson.type || 'text'}
                    </span>
                  </div>

                  {lesson.url && (
                    <div className="mt-2">
                      {lesson.type === 'video' ? (
                        <a
                          href={lesson.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Preview Video
                        </a>
                      ) : lesson.type === 'pdf' ? (
                        <a
                          href={lesson.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <File className="h-3 w-3" />
                          View PDF
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {lesson.url}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteLesson(lesson.id)}
                  className="p-1 hover:bg-red-100 rounded ml-2"
                  aria-label={`Delete ${lesson.title || 'lesson'}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card
          className={`text-center py-12 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : ''
          }`}
        >
          <CardContent>
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              No lessons yet. Add your first lesson!
            </p>
          </CardContent>
        </Card>
      )}

      {showAddLesson && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddLesson(false)}
        >
          <div
            className={`rounded-xl max-w-md w-full p-5 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3
                className={`font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Add Lesson
              </h3>
              <button
                onClick={() => setShowAddLesson(false)}
                aria-label="Close add lesson dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="Module title"
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : ''
                }`}
              />

              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Lesson title"
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : ''
                }`}
              />

              <div className="flex gap-2">
                <select
                  value={contentType}
                  onChange={(e) =>
                    setContentType(
                      e.target.value as 'video' | 'pdf' | 'text'
                    )
                  }
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : ''
                  }`}
                >
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="text">Text</option>
                </select>

                <input
                  type="number"
                  min={0}
                  value={lessonDuration}
                  onChange={(e) =>
                    setLessonDuration(Math.max(0, Number(e.target.value)))
                  }
                  placeholder="Minutes"
                  className={`w-24 px-3 py-2 text-sm border rounded-lg ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : ''
                  }`}
                />
              </div>

              <textarea
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                rows={3}
                placeholder={
                  contentType === 'video' ? 'Video URL' : 'Content'
                }
                className={`w-full px-3 py-2 text-sm border rounded-lg resize-none ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : ''
                }`}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddLesson(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddLesson}
                  className="flex-1 bg-green-700"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
