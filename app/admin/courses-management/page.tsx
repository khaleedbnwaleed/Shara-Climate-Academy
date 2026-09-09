'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Trash2,
  X,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Play,
  FileText,
  File,
  HelpCircle,
  PenTool,
  Clock,
  AlertCircle,
  Upload,
} from 'lucide-react';

import { db } from '@/lib/firebase';

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  getDoc,
} from 'firebase/firestore';


import { useTheme } from '@/context/theme-context';

type Module = {
  id: string;
  title: string;
  description: string;
  order: number;
  lessonCount?: number;
  courseId?: string;
};

type Lesson = {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'pdf' | 'quiz' | 'assignment';
  content: string;
  duration?: number;
  isFree: boolean;
  order: number;
  moduleId: string;
  courseId: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  duration?: number;
  imageUrl: string;
  imagePath?: string;
  totalStudents: number;
  rating: number;
  isPublished: boolean;
  lessonCount?: number;
};

const DEFAULT_COURSE_IMAGE =
  'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80';

export default function CourseManagement() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner' as const,
    price: 0,
    duration: 0,
    imageFile: null as File | null,
    imagePreview: '',
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    null
  );

  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);

  const [selectedModuleId, setSelectedModuleId] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingModules, setLoadingModules] = useState(false);

  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    type: 'video' as Lesson['type'],
    content: '',
    duration: 0,
    isFree: false,
  });

  // ============================================
  // FETCH COURSES
  // ============================================

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const querySnapshot = await getDocs(collection(db, 'courses'));

      const coursesData = querySnapshot.docs.map((courseDoc) => ({
        id: courseDoc.id,
        ...courseDoc.data(),
      })) as Course[];

      setCourses(coursesData);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FETCH MODULES AND LESSONS
  // ============================================

  const fetchModulesAndLessons = async (courseId: string) => {
    console.log('Fetching modules for course:', courseId);

    try {
      setLoadingModules(true);
      setError(null);
      setDebugInfo('Loading...');

      let modulesData: Module[] = [];
      let lessonsData: Lesson[] = [];

      // Fetch modules
      try {
        const modulesQ = query(
          collection(db, 'modules'),
          where('courseId', '==', courseId),
          orderBy('order', 'asc')
        );

        const modulesSnap = await getDocs(modulesQ);

        console.log('Modules found:', modulesSnap.size);

        modulesData = modulesSnap.docs.map((moduleDoc) => ({
          id: moduleDoc.id,
          ...moduleDoc.data(),
        })) as Module[];
      } catch (indexError: any) {
        console.warn(
          'Index not found, using simple query:',
          indexError.message
        );

        const modulesSimple = await getDocs(collection(db, 'modules'));

        modulesData = modulesSimple.docs
          .map(
            (moduleDoc) =>
              ({
                id: moduleDoc.id,
                ...moduleDoc.data(),
              }) as Module
          )
          .filter((module) => module.courseId === courseId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        console.log('Modules fallback:', modulesData.length);
      }

      // Fetch lessons
      try {
        const lessonsQ = query(
          collection(db, 'lessons'),
          where('courseId', '==', courseId),
          orderBy('order', 'asc')
        );

        const lessonsSnap = await getDocs(lessonsQ);

        console.log('Lessons found:', lessonsSnap.size);

        lessonsData = lessonsSnap.docs.map((lessonDoc) => ({
          id: lessonDoc.id,
          ...lessonDoc.data(),
        })) as Lesson[];
      } catch (indexError: any) {
        console.warn(
          'Index not found, using simple query:',
          indexError.message
        );

        const lessonsSimple = await getDocs(collection(db, 'lessons'));

        lessonsData = lessonsSimple.docs
          .map(
            (lessonDoc) =>
              ({
                id: lessonDoc.id,
                ...lessonDoc.data(),
              }) as Lesson
          )
          .filter((lesson) => lesson.courseId === courseId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        console.log('Lessons fallback:', lessonsData.length);
      }

      // Calculate module lesson counts
      modulesData.forEach((module) => {
        module.lessonCount = lessonsData.filter(
          (lesson) => lesson.moduleId === module.id
        ).length;
      });

      setModules(modulesData);
      setLessons(lessonsData);

      setDebugInfo(
        `Loaded ${modulesData.length} modules, ${lessonsData.length} lessons`
      );

      console.log('Final state:', {
        modules: modulesData.length,
        lessons: lessonsData.length,
      });
    } catch (error: any) {
      console.error('Error fetching modules/lessons:', error);

      setError('Failed to load course content: ' + error.message);
      setDebugInfo('Error: ' + error.message);
    } finally {
      setLoadingModules(false);
    }
  };

  // ============================================
  // COURSE EXPANSION
  // ============================================

  const toggleCourseExpand = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      setSelectedCourseId(null);
      setModules([]);
      setLessons([]);
      setDebugInfo('');
      setShowModuleForm(false);
      setShowLessonForm(false);
    } else {
      setExpandedCourse(courseId);
      setSelectedCourseId(courseId);

      setShowModuleForm(false);
      setShowLessonForm(false);

      await fetchModulesAndLessons(courseId);
    }
  };

  // ============================================
  // IMAGE SELECTION
  // ============================================

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // 5MB maximum
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Revoke old preview URL if one exists
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setFormData({
      ...formData,
      imageFile: file,
      imagePreview: previewUrl,
    });
  };

  const removeImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }

    setFormData({
      ...formData,
      imageFile: null,
      imagePreview: '',
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================
  // UPLOAD IMAGE TO GITHUB
  // ============================================

  const uploadCourseImage = async (
    file: File
  ): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-course-image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Failed to upload course image.'
      );
    }

    if (!data.url || !data.path) {
      throw new Error(
        'GitHub upload succeeded but no image URL was returned.'
      );
    }

    return {
      url: data.url,
      path: data.path,
    };
  };

  // ============================================
  // CREATE COURSE
  // ============================================

  const handleCreateCourse = async () => {
    if (!formData.title || !formData.description) {
      alert('Please fill in title and description');
      return;
    }

    try {
      setUploadingImage(true);

      let imageUrl = DEFAULT_COURSE_IMAGE;
      let imagePath: string | undefined;

      // Upload selected image through the secure server API.
      if (formData.imageFile) {
        const uploadedImage = await uploadCourseImage(
          formData.imageFile
        );

        imageUrl = uploadedImage.url;
        imagePath = uploadedImage.path;
      }

      const newCourse = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim() || 'General',
        level: formData.level,
        price: formData.price || 0,
        duration: formData.duration || 0,

        // GitHub image URL. Firestore stores only the URL/path.
        imageUrl,
        ...(imagePath ? { imagePath } : {}),

        totalStudents: 0,
        rating: 4.5,
        isPublished: true,
        lessonCount: 0,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save course metadata in Firestore
      const docRef = await addDoc(
        collection(db, 'courses'),
        newCourse
      );

      setCourses([
        {
          id: docRef.id,
          ...newCourse,
        },
        ...courses,
      ]);

      // Reset form
      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }

      setFormData({
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        duration: 0,
        imageFile: null,
        imagePreview: '',
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setShowCreateForm(false);

      setSuccessMessage(
        'Course created successfully!'
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error creating course:', error);

      alert(
        'Failed to create course: ' +
          (error.message || 'Unknown error')
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // ============================================
  // DELETE COURSE
  // ============================================

  const handleDeleteCourse = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this course?'
      )
    ) {
      return;
    }

    try {
      const course = courses.find(
        (item) => item.id === id
      );

      // Delete Firestore course document
      await deleteDoc(doc(db, 'courses', id));

      // Delete the GitHub image when this course owns one.
      // Old courses without imagePath are left untouched.
      if (course?.imagePath) {
        try {
          const imageResponse = await fetch(
            '/api/upload-course-image',
            {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                path: course.imagePath,
              }),
            }
          );

          if (!imageResponse.ok) {
            const imageError = await imageResponse.json().catch(
              () => ({})
            );

            console.warn(
              'Could not delete course image from GitHub:',
              imageError.error || imageResponse.statusText
            );
          } else {
            console.log(
              'Course image deleted from GitHub'
            );
          }
        } catch (imageError) {
          // Do not fail the whole course deletion if image cleanup fails.
          console.warn(
            'Could not delete course image from GitHub:',
            imageError
          );
        }
      }

      // Update local state
      setCourses(
        courses.filter((course) => course.id !== id)
      );

      if (expandedCourse === id) {
        setExpandedCourse(null);
        setSelectedCourseId(null);
        setModules([]);
        setLessons([]);
      }

      setSuccessMessage(
        'Course deleted successfully!'
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error(
        'Error deleting course:',
        error
      );

      alert(
        'Failed to delete course: ' +
          error.message
      );
    }
  };

  // ============================================
  // ADD MODULE
  // ============================================

  const handleAddModule = async () => {
    if (!moduleForm.title || !selectedCourseId) {
      alert('Please enter a module title');
      return;
    }

    setSaving(true);

    try {
      const moduleData = {
        courseId: selectedCourseId,
        title: moduleForm.title.trim(),
        description:
          moduleForm.description.trim() || '',
        order: modules.length + 1,
        createdAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'modules'),
        moduleData
      );

      console.log(
        'Module added with ID:',
        docRef.id
      );

      const savedDoc = await getDoc(docRef);

      console.log(
        'Saved module data:',
        savedDoc.data()
      );

      setModules([
        ...modules,
        {
          id: docRef.id,
          ...moduleData,
          lessonCount: 0,
        },
      ]);

      setModuleForm({
        title: '',
        description: '',
      });

      setShowModuleForm(false);

      setSuccessMessage(
        'Module added successfully!'
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error(
        'Error adding module:',
        error
      );

      alert(
        'Failed to add module: ' +
          error.message
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE MODULE
  // ============================================

  const handleDeleteModule = async (
    moduleId: string
  ) => {
    if (
      !confirm(
        'Delete this module and all its lessons?'
      )
    ) {
      return;
    }

    try {
      const lessonsToDelete = lessons.filter(
        (lesson) =>
          lesson.moduleId === moduleId
      );

      for (const lesson of lessonsToDelete) {
        await deleteDoc(
          doc(db, 'lessons', lesson.id)
        );
      }

      await deleteDoc(
        doc(db, 'modules', moduleId)
      );

      const newLessons = lessons.filter(
        (lesson) =>
          lesson.moduleId !== moduleId
      );

      setLessons(newLessons);

      setModules(
        modules.filter(
          (module) =>
            module.id !== moduleId
        )
      );

      // Update course lesson count
      if (selectedCourseId) {
        const courseRef = doc(
          db,
          'courses',
          selectedCourseId
        );

        await updateDoc(courseRef, {
          lessonCount: newLessons.length,
        });

        setCourses(
          courses.map((course) =>
            course.id === selectedCourseId
              ? {
                  ...course,
                  lessonCount:
                    newLessons.length,
                }
              : course
          )
        );
      }

      setSuccessMessage(
        'Module deleted successfully!'
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error(
        'Error deleting module:',
        error
      );

      alert(
        'Failed to delete module: ' +
          error.message
      );
    }
  };

  // ============================================
  // ADD LESSON
  // ============================================

  const handleAddLesson = async () => {
    if (!lessonForm.title || !selectedModuleId) {
      alert(
        'Please fill in all required fields'
      );
      return;
    }

    if (!selectedCourseId) {
      alert('No course selected');
      return;
    }

    setSaving(true);

    try {
      const moduleLessons = lessons.filter(
        (lesson) =>
          lesson.moduleId === selectedModuleId
      );

      const lessonData = {
        courseId: selectedCourseId,
        moduleId: selectedModuleId,
        title: lessonForm.title.trim(),
        description:
          lessonForm.description.trim() || '',
        type: lessonForm.type,
        content: lessonForm.content.trim() || '',
        duration: lessonForm.duration || 0,
        isFree: lessonForm.isFree || false,
        order: moduleLessons.length + 1,
        createdAt: new Date(),
      };

      console.log(
        'Saving lesson data:',
        lessonData
      );

      const docRef = await addDoc(
        collection(db, 'lessons'),
        lessonData
      );

      console.log(
        'Lesson added with ID:',
        docRef.id
      );

      const savedDoc = await getDoc(docRef);

      console.log(
        'Saved lesson data:',
        savedDoc.data()
      );

      const newLessons = [
        ...lessons,
        {
          id: docRef.id,
          ...lessonData,
        },
      ];

      setLessons(newLessons);

      // Update module lesson count
      const moduleRef = doc(
        db,
        'modules',
        selectedModuleId
      );

      await updateDoc(moduleRef, {
        lessonCount:
          moduleLessons.length + 1,
      });

      // Update module state
      setModules(
        modules.map((module) =>
          module.id === selectedModuleId
            ? {
                ...module,
                lessonCount:
                  moduleLessons.length + 1,
              }
            : module
        )
      );

      // Update course lesson count
      const courseLessons =
        newLessons.filter(
          (lesson) =>
            lesson.courseId ===
            selectedCourseId
        );

      const courseRef = doc(
        db,
        'courses',
        selectedCourseId
      );

      await updateDoc(courseRef, {
        lessonCount:
          courseLessons.length,
      });

      // Update course local state
      setCourses(
        courses.map((course) =>
          course.id === selectedCourseId
            ? {
                ...course,
                lessonCount:
                  courseLessons.length,
              }
            : course
        )
      );

      setLessonForm({
        title: '',
        description: '',
        type: 'video',
        content: '',
        duration: 0,
        isFree: false,
      });

      setShowLessonForm(false);

      setSuccessMessage(
        'Lesson added successfully!'
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error(
        'Error adding lesson:',
        error
      );

      alert(
        'Failed to add lesson: ' +
          error.message
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE LESSON
  // ============================================

  const handleDeleteLesson = async (
    lessonId: string
  ) => {
    if (!confirm('Delete this lesson?')) {
      return;
    }

    try {
      const deletedLesson = lessons.find(
        (lesson) =>
          lesson.id === lessonId
      );

      await deleteDoc(
        doc(db, 'lessons', lessonId)
      );

      const newLessons = lessons.filter(
        (lesson) =>
          lesson.id !== lessonId
      );

      setLessons(newLessons);

      // Update course lesson count
      if (selectedCourseId) {
        const courseLessons =
          newLessons.filter(
            (lesson) =>
              lesson.courseId ===
              selectedCourseId
          );

        const courseRef = doc(
          db,
          'courses',
          selectedCourseId
        );

        await updateDoc(courseRef, {
          lessonCount:
            courseLessons.length,
        });

        setCourses(
          courses.map((course) =>
            course.id === selectedCourseId
              ? {
                  ...course,
                  lessonCount:
                    courseLessons.length,
                }
              : course
          )
        );
      }

      // Update module lesson count
      if (deletedLesson) {
        setModules(
          modules.map((module) =>
            module.id ===
            deletedLesson.moduleId
              ? {
                  ...module,
                  lessonCount: Math.max(
                    0,
                    (module.lessonCount ||
                      1) - 1
                  ),
                }
              : module
          )
        );

        // Also persist module lesson count
        const moduleRef = doc(
          db,
          'modules',
          deletedLesson.moduleId
        );

        const remainingModuleLessons =
          newLessons.filter(
            (lesson) =>
              lesson.moduleId ===
              deletedLesson.moduleId
          );

        await updateDoc(moduleRef, {
          lessonCount:
            remainingModuleLessons.length,
        });
      }

      setSuccessMessage(
        'Lesson deleted successfully!'
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error(
        'Error deleting lesson:',
        error
      );

      alert(
        'Failed to delete lesson: ' +
          error.message
      );
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const getLessonsForModule = (
    moduleId: string
  ) => {
    return lessons.filter(
      (lesson) =>
        lesson.moduleId === moduleId
    );
  };

  const getLessonTypeIcon = (
    type: string
  ) => {
    switch (type) {
      case 'video':
        return (
          <Play className="h-4 w-4 text-blue-500" />
        );

      case 'text':
        return (
          <FileText className="h-4 w-4 text-green-500" />
        );

      case 'pdf':
        return (
          <File className="h-4 w-4 text-red-500" />
        );

      case 'quiz':
        return (
          <HelpCircle className="h-4 w-4 text-yellow-500" />
        );

      case 'assignment':
        return (
          <PenTool className="h-4 w-4 text-purple-500" />
        );

      default:
        return (
          <BookOpen className="h-4 w-4 text-gray-500" />
        );
    }
  };

  const toggleModule = (
    moduleId: string
  ) => {
    const newSet = new Set(
      expandedModules
    );

    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }

    setExpandedModules(newSet);
  };

  const filteredCourses =
    courses.filter(
      (course) =>
        course.title
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
        course.category
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  // ============================================
  // UI
  // ============================================

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Course Management
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Total: {courses.length} courses
          </p>
        </div>

        <Button
          className="bg-green-700 hover:bg-green-800 w-full sm:w-auto"
          onClick={() =>
            setShowCreateForm(
              !showCreateForm
            )
          }
        >
          <Plus className="h-4 w-4 mr-2" />

          {showCreateForm
            ? 'Cancel'
            : 'New Course'}
        </Button>

      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">

          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />

          <div>
            <p className="font-medium">
              Error
            </p>

            <p className="text-sm">
              {error}
            </p>
          </div>

        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Debug */}
      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          {debugInfo}
        </div>
      )}

      {/* Create Course Form */}
      {showCreateForm && (
        <Card
          className={`p-6 ${
            isDarkMode
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white border-gray-100'
          }`}
        >

          <h3 className="text-lg font-semibold text-foreground mb-4">
            Create New Course
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            {/* Title */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Title *
              </label>

              <Input
                placeholder="Course title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Category
              </label>

              <Input
                placeholder="e.g., Climate Science"
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category:
                      e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Price (N)
              </label>

              <Input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price:
                      parseInt(
                        e.target.value
                      ) || 0,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Duration (hours)
              </label>

              <Input
                type="number"
                placeholder="0"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration:
                      parseInt(
                        e.target.value
                      ) || 0,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Level */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Level
              </label>

              <select
                value={formData.level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    level:
                      e.target.value as
                        | 'beginner'
                        | 'intermediate'
                        | 'advanced',
                  })
                }
                className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                <option value="beginner">
                  Beginner
                </option>

                <option value="intermediate">
                  Intermediate
                </option>

                <option value="advanced">
                  Advanced
                </option>
              </select>
            </div>

          </div>

          {/* Course Image */}
          <div className="mb-4">

            <label className="text-sm font-medium text-foreground">
              Course Image
            </label>

            <div className="mt-2">

              {formData.imagePreview ? (
                <div className="relative inline-block">

                  <img
                    src={
                      formData.imagePreview
                    }
                    alt="Course preview"
                    className="w-40 h-28 object-cover rounded-lg border border-gray-300"
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>

                </div>
              ) : (
                <div
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition hover:border-green-500 ${
                    isDarkMode
                      ? 'border-gray-600 hover:border-green-400'
                      : 'border-gray-300'
                  }`}
                >

                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />

                  <p className="text-sm text-muted-foreground">
                    Click to upload course image
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, JPEG up to 5MB
                  </p>

                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={
                  handleImageSelect
                }
                className="hidden"
              />

            </div>
          </div>

          {/* Description */}
          <div>

            <label className="text-sm font-medium text-foreground">
              Description *
            </label>

            <textarea
              placeholder="Course description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description:
                    e.target.value,
                })
              }
              className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'border-gray-300'
              }`}
              rows={3}
            />

          </div>

          {/* Buttons */}
          <div className="flex justify-end mt-4 gap-2">

            <Button
              variant="outline"
              onClick={() =>
                setShowCreateForm(false)
              }
              disabled={uploadingImage}
            >
              Cancel
            </Button>

            <Button
              className="bg-green-700 hover:bg-green-800"
              onClick={
                handleCreateCourse
              }
              disabled={
                uploadingImage ||
                !formData.title ||
                !formData.description
              }
            >

              {uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                'Create Course'
              )}

            </Button>

          </div>

        </Card>
      )}

      {/* Search */}
      <div className="relative">

        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <Input
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          className="pl-10"
        />

      </div>

      {/* Course Count */}
      <div className="flex justify-between items-center">

        <p
          className={`text-sm ${
            isDarkMode
              ? 'text-gray-400'
              : 'text-gray-500'
          }`}
        >
          Showing{' '}
          <span className="font-semibold">
            {filteredCourses.length}
          </span>{' '}
          of {courses.length} courses
        </p>

      </div>

      {/* Courses */}
      {filteredCourses.length === 0 ? (
        <Card className="text-center py-12">

          <CardContent>
            <p className="text-muted-foreground">
              No courses found
            </p>
          </CardContent>

        </Card>
      ) : (
        <div className="space-y-4">

          {filteredCourses.map(
            (course) => {

              const isExpanded =
                expandedCourse ===
                course.id;

              return (
                <Card
                  key={course.id}
                  className={`overflow-hidden transition ${
                    isDarkMode
                      ? 'bg-gray-800/50 border-gray-700'
                      : 'bg-white border-gray-100'
                  }`}
                >

                  {/* Course Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() =>
                      toggleCourseExpand(
                        course.id
                      )
                    }
                  >

                    <div className="flex items-center gap-4 flex-1 min-w-0">

                      <img
                        src={
                          course.imageUrl ||
                          DEFAULT_COURSE_IMAGE
                        }
                        alt={
                          course.title
                        }
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).src =
                            DEFAULT_COURSE_IMAGE;
                        }}
                      />

                      <div className="flex-1 min-w-0">

                        <h3
                          className={`font-semibold ${
                            isDarkMode
                              ? 'text-white'
                              : 'text-gray-900'
                          }`}
                        >
                          {
                            course.title
                          }
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 text-xs">

                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              course.level ===
                              'beginner'
                                ? 'bg-green-100 text-green-800'
                                : course.level ===
                                  'intermediate'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {course.level ||
                              'beginner'}
                          </span>

                          <span className="text-muted-foreground">
                            {course.category ||
                              'Uncategorized'}
                          </span>

                          <span className="text-muted-foreground">
                            {course.price ===
                            0
                              ? 'Free'
                              : `N${course.price}`}
                          </span>

                          <span className="text-muted-foreground">
                            {course.duration ||
                              0}
                            h -{' '}
                            {course.totalStudents ||
                              0}{' '}
                            students
                          </span>

                          <span className="text-muted-foreground">
                            {course.lessonCount ||
                              0}{' '}
                            lessons
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              course.isPublished !==
                              false
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-500 text-white'
                            }`}
                          >
                            {course.isPublished !==
                            false
                              ? 'Published'
                              : 'Draft'}
                          </span>

                        </div>

                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() =>
                          handleDeleteCourse(
                            course.id
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleCourseExpand(
                            course.id
                          )
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>

                    </div>

                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">

                      {loadingModules ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                        </div>
                      ) : (
                        <>
                          <p
                            className={`text-sm mb-4 ${
                              isDarkMode
                                ? 'text-gray-300'
                                : 'text-gray-600'
                            }`}
                          >
                            {
                              course.description
                            }
                          </p>

                          <div className="space-y-4">

                            {/* Content Header */}
                            <div className="flex items-center justify-between">

                              <h4
                                className={`font-semibold ${
                                  isDarkMode
                                    ? 'text-white'
                                    : 'text-gray-900'
                                }`}
                              >
                                Course Content (
                                {
                                  modules.length
                                }{' '}
                                modules,{' '}
                                {
                                  lessons.length
                                }{' '}
                                lessons)
                              </h4>

                              <div className="flex gap-2">

                                {!showModuleForm && (
                                  <Button
                                    size="sm"
                                    className="bg-green-700 hover:bg-green-800"
                                    onClick={() => {
                                      setModuleForm(
                                        {
                                          title:
                                            '',
                                          description:
                                            '',
                                        }
                                      );

                                      setShowModuleForm(
                                        true
                                      );
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Module
                                  </Button>
                                )}

                                {!showLessonForm &&
                                  modules.length >
                                    0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedModuleId(
                                          modules[0]
                                            .id
                                        );

                                        setLessonForm(
                                          {
                                            title:
                                              '',
                                            description:
                                              '',
                                            type: 'video',
                                            content:
                                              '',
                                            duration:
                                              0,
                                            isFree:
                                              false,
                                          }
                                        );

                                        setShowLessonForm(
                                          true
                                        );
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Lesson
                                    </Button>
                                  )}

                              </div>
                            </div>

                            {/* Module Form */}
                            {showModuleForm && (
                              <Card
                                className={
                                  isDarkMode
                                    ? 'bg-gray-700/50 border-gray-600'
                                    : 'bg-gray-50'
                                }
                              >
                                <CardContent className="pt-4">

                                  <div className="space-y-3">

                                    <Input
                                      placeholder="Module Title *"
                                      value={
                                        moduleForm.title
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setModuleForm(
                                          {
                                            ...moduleForm,
                                            title:
                                              e
                                                .target
                                                .value,
                                          }
                                        )
                                      }
                                      className={
                                        isDarkMode
                                          ? 'bg-gray-600 border-gray-500 text-white'
                                          : ''
                                      }
                                    />

                                    <Input
                                      placeholder="Description (optional)"
                                      value={
                                        moduleForm.description
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setModuleForm(
                                          {
                                            ...moduleForm,
                                            description:
                                              e
                                                .target
                                                .value,
                                          }
                                        )
                                      }
                                      className={
                                        isDarkMode
                                          ? 'bg-gray-600 border-gray-500 text-white'
                                          : ''
                                      }
                                    />

                                    <div className="flex gap-2">

                                      <Button
                                        size="sm"
                                        className="bg-green-700 hover:bg-green-800"
                                        onClick={
                                          handleAddModule
                                        }
                                        disabled={
                                          saving
                                        }
                                      >
                                        {saving ? (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : (
                                          <Save className="h-3 w-3 mr-1" />
                                        )}

                                        Add Module
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setShowModuleForm(
                                            false
                                          );

                                          setModuleForm(
                                            {
                                              title:
                                                '',
                                              description:
                                                '',
                                            }
                                          );
                                        }}
                                      >
                                        Cancel
                                      </Button>

                                    </div>

                                  </div>

                                </CardContent>
                              </Card>
                            )}

                            {/* Modules */}
                            {modules.length ===
                            0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No modules yet.
                                Add your first
                                module!
                              </p>
                            ) : (
                              <div className="space-y-2">

                                {modules.map(
                                  (
                                    module
                                  ) => {

                                    const moduleLessons =
                                      getLessonsForModule(
                                        module.id
                                      );

                                    const isModuleExpanded =
                                      expandedModules.has(
                                        module.id
                                      );

                                    return (
                                      <div
                                        key={
                                          module.id
                                        }
                                        className={`rounded-lg border ${
                                          isDarkMode
                                            ? 'border-gray-700'
                                            : 'border-gray-200'
                                        }`}
                                      >

                                        {/* Module Header */}
                                        <div
                                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                          onClick={() =>
                                            toggleModule(
                                              module.id
                                            )
                                          }
                                        >

                                          <div className="flex items-center gap-2">

                                            {isModuleExpanded ? (
                                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            )}

                                            <BookOpen className="h-4 w-4 text-green-500" />

                                            <span
                                              className={`font-medium ${
                                                isDarkMode
                                                  ? 'text-white'
                                                  : 'text-gray-900'
                                              }`}
                                            >
                                              {
                                                module.title
                                              }
                                            </span>

                                            <span className="text-xs text-muted-foreground">
                                              (
                                              {
                                                module.lessonCount ||
                                                0
                                              }{' '}
                                              lessons)
                                            </span>

                                          </div>

                                          <div
                                            className="flex gap-1"
                                            onClick={(
                                              e
                                            ) =>
                                              e.stopPropagation()
                                            }
                                          >

                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                setSelectedModuleId(
                                                  module.id
                                                );

                                                setLessonForm(
                                                  {
                                                    title:
                                                      '',
                                                    description:
                                                      '',
                                                    type: 'video',
                                                    content:
                                                      '',
                                                    duration:
                                                      0,
                                                    isFree:
                                                      false,
                                                  }
                                                );

                                                setShowLessonForm(
                                                  true
                                                );
                                              }}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>

                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-red-600 hover:text-red-700"
                                              onClick={() =>
                                                handleDeleteModule(
                                                  module.id
                                                )
                                              }
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>

                                          </div>

                                        </div>

                                        {/* Lessons */}
                                        {isModuleExpanded &&
                                          moduleLessons.length >
                                            0 && (
                                            <div
                                              className={`p-3 pt-0 space-y-1.5 ${
                                                isDarkMode
                                                  ? 'bg-gray-800/30'
                                                  : 'bg-gray-50/50'
                                              }`}
                                            >

                                              {moduleLessons.map(
                                                (
                                                  lesson
                                                ) => (
                                                  <div
                                                    key={
                                                      lesson.id
                                                    }
                                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                                      isDarkMode
                                                        ? 'bg-gray-700/30'
                                                        : 'bg-white'
                                                    }`}
                                                  >

                                                    <div className="flex items-center gap-3 min-w-0">

                                                      {getLessonTypeIcon(
                                                        lesson.type
                                                      )}

                                                      <span
                                                        className={`text-sm truncate ${
                                                          isDarkMode
                                                            ? 'text-gray-300'
                                                            : 'text-gray-700'
                                                        }`}
                                                      >
                                                        {
                                                          lesson.title
                                                        }
                                                      </span>

                                                      {lesson.isFree && (
                                                        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                                          Free
                                                        </span>
                                                      )}

                                                      {lesson.duration &&
                                                        lesson.duration >
                                                          0 && (
                                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />

                                                            {
                                                              lesson.duration
                                                            }{' '}
                                                            min
                                                          </span>
                                                        )}

                                                    </div>

                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="text-red-600 hover:text-red-700"
                                                      onClick={() =>
                                                        handleDeleteLesson(
                                                          lesson.id
                                                        )
                                                      }
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>

                                                  </div>
                                                )
                                              )}

                                            </div>
                                          )}

                                      </div>
                                    );
                                  }
                                )}

                              </div>
                            )}

                            {/* Lesson Form */}
                            {showLessonForm && (
                              <Card
                                className={
                                  isDarkMode
                                    ? 'bg-gray-700/50 border-gray-600'
                                    : 'bg-gray-50'
                                }
                              >
                                <CardContent className="pt-4">

                                  <div className="space-y-3">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                                      {/* Title */}
                                      <div>

                                        <label className="text-xs font-medium text-foreground">
                                          Lesson Title *
                                        </label>

                                        <Input
                                          placeholder="Lesson title"
                                          value={
                                            lessonForm.title
                                          }
                                          onChange={(
                                            e
                                          ) =>
                                            setLessonForm(
                                              {
                                                ...lessonForm,
                                                title:
                                                  e
                                                    .target
                                                    .value,
                                              }
                                            )
                                          }
                                          className={`mt-1 ${
                                            isDarkMode
                                              ? 'bg-gray-600 border-gray-500 text-white'
                                              : ''
                                          }`}
                                        />

                                      </div>

                                      {/* Type */}
                                      <div>

                                        <label className="text-xs font-medium text-foreground">
                                          Type
                                        </label>

                                        <select
                                          value={
                                            lessonForm.type
                                          }
                                          onChange={(
                                            e
                                          ) =>
                                            setLessonForm(
                                              {
                                                ...lessonForm,
                                                type:
                                                  e
                                                    .target
                                                    .value as Lesson['type'],
                                              }
                                            )
                                          }
                                          className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                                            isDarkMode
                                              ? 'bg-gray-600 border-gray-500 text-white'
                                              : 'border-gray-300'
                                          }`}
                                        >
                                          <option value="video">
                                            Video
                                          </option>

                                          <option value="text">
                                            Text
                                          </option>

                                          <option value="pdf">
                                            PDF
                                          </option>

                                          <option value="quiz">
                                            Quiz
                                          </option>

                                          <option value="assignment">
                                            Assignment
                                          </option>
                                        </select>

                                      </div>

                                    </div>

                                    {/* Content */}
                                    <div>

                                      <label className="text-xs font-medium text-foreground">
                                        Content URL or Text
                                      </label>

                                      <Input
                                        placeholder={
                                          lessonForm.type ===
                                          'video'
                                            ? 'https://www.youtube.com/watch?v=...'
                                            : 'Enter content...'
                                        }
                                        value={
                                          lessonForm.content
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          setLessonForm(
                                            {
                                              ...lessonForm,
                                              content:
                                                e
                                                  .target
                                                  .value,
                                            }
                                          )
                                        }
                                        className={`mt-1 ${
                                          isDarkMode
                                            ? 'bg-gray-600 border-gray-500 text-white'
                                            : ''
                                        }`}
                                      />

                                    </div>

                                    {/* Duration / Free */}
                                    <div className="grid grid-cols-2 gap-3">

                                      <div>

                                        <label className="text-xs font-medium text-foreground">
                                          Duration (min)
                                        </label>

                                        <Input
                                          type="number"
                                          placeholder="10"
                                          value={
                                            lessonForm.duration
                                          }
                                          onChange={(
                                            e
                                          ) =>
                                            setLessonForm(
                                              {
                                                ...lessonForm,
                                                duration:
                                                  parseInt(
                                                    e
                                                      .target
                                                      .value
                                                  ) ||
                                                  0,
                                              }
                                            )
                                          }
                                          className={`mt-1 ${
                                            isDarkMode
                                              ? 'bg-gray-600 border-gray-500 text-white'
                                              : ''
                                          }`}
                                        />

                                      </div>

                                      <div className="flex items-center gap-2 mt-6">

                                        <input
                                          type="checkbox"
                                          id="isFree"
                                          checked={
                                            lessonForm.isFree
                                          }
                                          onChange={(
                                            e
                                          ) =>
                                            setLessonForm(
                                              {
                                                ...lessonForm,
                                                isFree:
                                                  e
                                                    .target
                                                    .checked,
                                              }
                                            )
                                          }
                                          className="h-4 w-4 rounded border-gray-300 text-green-600"
                                        />

                                        <label
                                          htmlFor="isFree"
                                          className="text-sm text-foreground"
                                        >
                                          Free Preview
                                        </label>

                                      </div>

                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-2">

                                      <Button
                                        size="sm"
                                        className="bg-green-700 hover:bg-green-800"
                                        onClick={
                                          handleAddLesson
                                        }
                                        disabled={
                                          saving
                                        }
                                      >
                                        {saving ? (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : (
                                          <Save className="h-3 w-3 mr-1" />
                                        )}

                                        Add Lesson
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setShowLessonForm(
                                            false
                                          );

                                          setLessonForm(
                                            {
                                              title:
                                                '',
                                              description:
                                                '',
                                              type: 'video',
                                              content:
                                                '',
                                              duration:
                                                0,
                                              isFree:
                                                false,
                                            }
                                          );
                                        }}
                                      >
                                        Cancel
                                      </Button>

                                    </div>

                                  </div>

                                </CardContent>
                              </Card>
                            )}

                          </div>
                        </>
                      )}

                    </div>
                  )}

                </Card>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}