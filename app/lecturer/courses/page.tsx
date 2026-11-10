
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  X,
  Trash2,
  Users,
  Star,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

type Student = {
  id: string;
  name?: string;
  email?: string | null;
  role?: string;
  enrolledCourses?: string[];
};

type LecturerCourse = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  level: CourseLevel;
  price?: number;
  duration?: number;
  image: string;
  rating?: number;
  totalStudents?: number;
  lessonCount: number;
  realStudentCount: number;
};

type CourseFormData = {
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  price: number;
  duration: number;
};

const DEFAULT_COURSE_IMAGE =
  'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80';

export default function LecturerCoursesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const instructorName = user?.name ?? 'Lecturer';

  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<
    'all' | CourseLevel
  >('all');
  const [showLevelFilter, setShowLevelFilter] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    price: 0,
    duration: 0,
  });

  const [imagePreview, setImagePreview] = useState('');
  const [selectedImageFile, setSelectedImageFile] =
    useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const levels: {
    value: 'all' | CourseLevel;
    label: string;
  }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  useEffect(() => {
    void fetchData();
  }, [instructorName]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const showNotification = (
    type: 'success' | 'error',
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read the selected image.'));
        }
      };

      reader.onerror = () => {
        reject(
          reader.error ?? new Error('Unable to read the selected image.')
        );
      };
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users and explicitly type each Firestore document.
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const allUsers: Student[] = usersSnapshot.docs.map(
        (userDoc) => ({
          ...userDoc.data(),
          id: userDoc.id,
        })
      );

      // Filter only after the documents have been typed.
      const students = allUsers.filter(
        (student) =>
          student.role === 'student' ||
          student.role === 'professional'
      );

      // Fetch courses belonging to this lecturer.
      const coursesQuery = query(
        collection(db, 'courses'),
        where('instructorName', '==', instructorName)
      );

      const coursesSnapshot = await getDocs(coursesQuery);

      const coursesData: LecturerCourse[] = await Promise.all(
        coursesSnapshot.docs.map(async (courseDoc) => {
          const courseData = courseDoc.data();

          const lessonsRef = collection(
            db,
            'courses',
            courseDoc.id,
            'lessons'
          );

          const lessonsSnapshot = await getDocs(lessonsRef);

          const enrolledStudents = students.filter((student) =>
            student.enrolledCourses?.includes(courseDoc.id)
          ).length;

          const rawLevel = courseData.level as string | undefined;

          const level: CourseLevel =
            rawLevel === 'intermediate' || rawLevel === 'advanced'
              ? rawLevel
              : 'beginner';

          return {
            id: courseDoc.id,
            title: courseData.title as string | undefined,
            description: courseData.description as
              | string
              | undefined,
            category: courseData.category as string | undefined,
            level,
            price: courseData.price as number | undefined,
            duration: courseData.duration as number | undefined,
            image:
              (courseData.imageUrl as string | undefined) ||
              DEFAULT_COURSE_IMAGE,
            rating: courseData.rating as number | undefined,
            totalStudents: courseData.totalStudents as
              | number
              | undefined,
            lessonCount: lessonsSnapshot.size,
            realStudentCount: enrolledStudents,
          };
        })
      );

      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching lecturer courses:', error);
      showNotification('error', 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      showNotification(
        'error',
        'Please fill in all required fields.'
      );
      return;
    }

    if (formData.price < 0 || formData.duration < 0) {
      showNotification(
        'error',
        'Price and duration cannot be negative.'
      );
      return;
    }

    try {
      setUploadingImage(true);

      let imageUrl = DEFAULT_COURSE_IMAGE;

      if (selectedImageFile) {
        try {
          imageUrl = await fileToBase64(selectedImageFile);
        } catch (error) {
          console.error('Error reading course image:', error);
          showNotification(
            'error',
            'Failed to read the selected image.'
          );
          return;
        }
      }

      const newCourse = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim() || 'Climate',
        level: formData.level,
        duration: formData.duration,
        price: formData.price,
        imageUrl,
        instructorName,
        rating: 4.5,
        totalStudents: 0,
        isPublished: true,
        createdAt: new Date(),
        lessonCount: 0,
      };

      await addDoc(collection(db, 'courses'), newCourse);

      await fetchData();

      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        duration: 0,
      });

      setSelectedImageFile(null);
      setImagePreview('');

      showNotification('success', 'Course created successfully!');
    } catch (error) {
      console.error('Error creating course:', error);
      showNotification(
        'error',
        'Failed to create course. Please try again.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (
      !confirm(
        'Delete this course? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'courses', id));

      setCourses((currentCourses) =>
        currentCourses.filter((course) => course.id !== id)
      );

      showNotification('success', 'Course deleted successfully.');
    } catch (error) {
      console.error('Error deleting course:', error);
      showNotification(
        'error',
        'Failed to delete course. Please try again.'
      );
    }
  };

  const filteredCourses = courses.filter((course) => {
    const normalizedSearch = searchTerm.toLowerCase();

    const matchesSearch =
      (course.title ?? '').toLowerCase().includes(normalizedSearch) ||
      (course.category ?? '').toLowerCase().includes(normalizedSearch);

    const matchesLevel =
      selectedLevel === 'all' || course.level === selectedLevel;

    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed right-4 top-20 z-50 max-w-sm animate-in slide-in-from-right-5">
          <div
            role="status"
            className={`flex items-center gap-3 rounded-lg p-4 text-sm shadow-lg ${
              notification.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <p>{notification.message}</p>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-auto"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            My Courses
          </h1>
          <p
            className={`mt-1 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Manage and organize your course content
          </p>
        </div>

        <Button
          onClick={() => setShowCreateForm(true)}
          className="whitespace-nowrap bg-green-700 shadow-sm hover:bg-green-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search courses by title or category..."
            className={`pl-10 ${
              isDarkMode
                ? 'border-gray-700 bg-gray-800 text-white'
                : ''
            }`}
          />
        </div>

        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowLevelFilter(!showLevelFilter)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {levels.find((level) => level.value === selectedLevel)
              ?.label || 'All Levels'}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showLevelFilter ? 'rotate-180' : ''
              }`}
            />
          </Button>

          {showLevelFilter && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowLevelFilter(false)}
              />

              <div
                className={`absolute right-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-lg border shadow-lg ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {levels.map((level) => (
                  <button
                    type="button"
                    key={level.value}
                    onClick={() => {
                      setSelectedLevel(level.value);
                      setShowLevelFilter(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedLevel === level.value
                        ? 'bg-green-50 font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : isDarkMode
                          ? 'text-gray-300'
                          : 'text-gray-700'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Stats */}
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Showing{' '}
          <span className="font-semibold">
            {filteredCourses.length}
          </span>{' '}
          of {courses.length} courses
          {selectedLevel !== 'all' && (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Filtered by:{' '}
              {levels.find((level) => level.value === selectedLevel)
                ?.label}
            </span>
          )}
        </p>

        {selectedLevel !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLevel('all')}
            className="text-sm text-green-600 hover:text-green-700"
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${
                isDarkMode
                  ? 'border-gray-700 bg-gray-800'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col md:flex-row">
                <div className="h-36 overflow-hidden bg-gray-200 dark:bg-gray-700 md:w-36">
                  <img
                    src={course.image}
                    alt={course.title ?? 'Course image'}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`line-clamp-1 text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {course.title ?? 'Untitled course'}
                    </h3>

                    <Badge level={course.level} />
                  </div>

                  <p
                    className={`mt-2 line-clamp-2 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {course.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span>{course.realStudentCount} students</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                      <span>{course.lessonCount} lessons</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{course.rating ?? 4.5}</span>
                    </span>

                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ₦{course.price ?? 0}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/lecturer/courses/${course.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Manage Course
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCourse(course.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      aria-label={`Delete ${course.title ?? 'course'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card
          className={`py-16 text-center ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}
        >
          <CardContent>
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />

            <h3
              className={`mb-2 text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {searchTerm || selectedLevel !== 'all'
                ? 'No matching courses'
                : 'No courses yet'}
            </h3>

            <p
              className={`mb-6 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {searchTerm || selectedLevel !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first course'}
            </p>

            {(searchTerm || selectedLevel !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedLevel('all');
                }}
              >
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Course Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className={`max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl p-6 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Create New Course
              </h3>

              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close create course form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="course-title"
                  className={`mb-1 block text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Course Title *
                </label>

                <input
                  id="course-title"
                  type="text"
                  value={formData.title}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      title: event.target.value,
                    })
                  }
                  placeholder="e.g., Climate Science 101"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="course-description"
                  className={`mb-1 block text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Description *
                </label>

                <textarea
                  id="course-description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="What will students learn?"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="course-category"
                    className={`mb-1 block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Category
                  </label>

                  <input
                    id="course-category"
                    type="text"
                    value={formData.category}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        category: event.target.value,
                      })
                    }
                    placeholder="e.g., Climate Science"
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="course-level"
                    className={`mb-1 block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Level
                  </label>

                  <select
                    id="course-level"
                    value={formData.level}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        level: event.target.value as CourseLevel,
                      })
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="course-duration"
                    className={`mb-1 block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Duration (hours)
                  </label>

                  <input
                    id="course-duration"
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        duration: Math.max(
                          0,
                          Number(event.target.value)
                        ),
                      })
                    }
                    placeholder="Hours"
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="course-price"
                    className={`mb-1 block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Price (₦)
                  </label>

                  <input
                    id="course-price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        price: Math.max(
                          0,
                          Number(event.target.value)
                        ),
                      })
                    }
                    placeholder="0 for free"
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="course-image"
                  className={`mb-1 block text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Course Image
                </label>

                <input
                  id="course-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      if (imagePreview) {
                        URL.revokeObjectURL(imagePreview);
                      }

                      setSelectedImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    } else {
                      setSelectedImageFile(null);
                      setImagePreview('');
                    }
                  }}
                  className="text-sm"
                />

                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Course image preview"
                    className="mt-2 h-24 w-full rounded-lg object-cover"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleCreateCourse}
                  disabled={uploadingImage}
                  className="flex-1 bg-green-700 hover:bg-green-800"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Course'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ level }: { level: CourseLevel }) {
  const styles: Record<CourseLevel, string> = {
    beginner:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    intermediate:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const labels: Record<CourseLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}
