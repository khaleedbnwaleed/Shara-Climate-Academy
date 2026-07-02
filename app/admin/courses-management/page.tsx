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
  Github,
  ChevronDown,
  ChevronRight,
  Edit,
  Save,
  Loader2,
  Play,
  FileText,
  File,
  HelpCircle,
  PenTool,
  Clock,
  AlertCircle,
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
  imageUrl: string;
  totalStudents: number;
  rating: number;
  isPublished: boolean;
  lessonCount?: number;
};

export default function CourseManagement() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const GITHUB_USERNAME = 'sabirmuhdbabangida5855';
  const GITHUB_REPO = 'shara-images';
  const GITHUB_BRANCH = 'main';
  const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
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

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingModules, setLoadingModules] = useState(false);

  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    type: 'video' as Lesson['type'],
    content: '',
    duration: 0,
    isFree: false,
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[];
      setCourses(coursesData);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchModulesAndLessons = async (courseId: string) => {
    console.log('Fetching modules for course:', courseId);
    try {
      setLoadingModules(true);
      setError(null);
      setDebugInfo('Loading...');
      
      let modulesData: Module[] = [];
      let lessonsData: Lesson[] = [];
      
      try {
        const modulesQ = query(
          collection(db, 'modules'),
          where('courseId', '==', courseId),
          orderBy('order', 'asc')
        );
        const modulesSnap = await getDocs(modulesQ);
        console.log('Modules found:', modulesSnap.size);
        modulesData = modulesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Module[];
      } catch (indexError: any) {
        console.warn('Index not found, using simple query:', indexError.message);
        const modulesSimple = await getDocs(collection(db, 'modules'));
        modulesData = modulesSimple.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Module))
          .filter((m) => m.courseId === courseId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('Modules (fallback):', modulesData.length);
      }

      try {
        const lessonsQ = query(
          collection(db, 'lessons'),
          where('courseId', '==', courseId),
          orderBy('order', 'asc')
        );
        const lessonsSnap = await getDocs(lessonsQ);
        console.log('Lessons found:', lessonsSnap.size);
        lessonsData = lessonsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Lesson[];
      } catch (indexError: any) {
        console.warn('Index not found, using simple query:', indexError.message);
        const lessonsSimple = await getDocs(collection(db, 'lessons'));
        lessonsData = lessonsSimple.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Lesson))
          .filter((l) => l.courseId === courseId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('Lessons (fallback):', lessonsData.length);
      }

      for (const module of modulesData) {
        module.lessonCount = lessonsData.filter((l) => l.moduleId === module.id).length;
      }

      setModules(modulesData);
      setLessons(lessonsData);
      setDebugInfo(`Loaded ${modulesData.length} modules, ${lessonsData.length} lessons`);
      console.log('Final state:', { modules: modulesData.length, lessons: lessonsData.length });
    } catch (error: any) {
      console.error('Error fetching modules/lessons:', error);
      setError('Failed to load course content: ' + error.message);
      setDebugInfo('Error: ' + error.message);
    } finally {
      setLoadingModules(false);
    }
  };

  const toggleCourseExpand = async (courseId: string) => {
    console.log('Toggling course:', courseId);
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      setModules([]);
      setLessons([]);
      setDebugInfo('');
    } else {
      setExpandedCourse(courseId);
      setSelectedCourseId(courseId);
      await fetchModulesAndLessons(courseId);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setFormData({
        ...formData,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      });
    }
  };

  const removeImage = () => {
    setFormData({
      ...formData,
      imageFile: null,
      imagePreview: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadToGitHub = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `course-${timestamp}.${extension}`;

      const reader = new FileReader();
      const base64String = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${fileName}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          message: `Add course image: ${fileName}`,
          content: base64String,
          branch: GITHUB_BRANCH,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub upload failed: ${response.statusText}`);
      }

      return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/${GITHUB_BRANCH}/${fileName}`;
    } catch (error) {
      console.error('Error uploading to GitHub:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!formData.title || !formData.description) {
      alert('Please fill in title and description');
      return;
    }

    if (!GITHUB_TOKEN) {
      alert('GitHub token not configured');
      return;
    }

    try {
      let imageUrl = 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80';

      if (formData.imageFile) {
        imageUrl = await uploadToGitHub(formData.imageFile);
      }

      const newCourse = {
        title: formData.title,
        description: formData.description,
        category: formData.category || 'General',
        level: formData.level,
        price: formData.price || 0,
        duration: formData.duration || 0,
        imageUrl: imageUrl,
        totalStudents: 0,
        rating: 4.5,
        isPublished: true,
        lessonCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'courses'), newCourse);
      setCourses([{ id: docRef.id, ...newCourse }, ...courses]);

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
      setSuccessMessage('Course created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error creating course:', error);
      alert('Failed to create course: ' + error.message);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await deleteDoc(doc(db, 'courses', id));
      setCourses(courses.filter((course) => course.id !== id));
      if (expandedCourse === id) {
        setExpandedCourse(null);
        setModules([]);
        setLessons([]);
      }
      setSuccessMessage('Course deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course: ' + error.message);
    }
  };

  const handleAddModule = async () => {
    if (!moduleForm.title || !selectedCourseId) {
      alert('Please enter a module title');
      return;
    }

    setSaving(true);
    try {
      const moduleData = {
        courseId: selectedCourseId,
        title: moduleForm.title,
        description: moduleForm.description || '',
        order: modules.length + 1,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'modules'), moduleData);
      console.log('Module added with ID:', docRef.id);
      
      const savedDoc = await getDoc(docRef);
      console.log('Saved module data:', savedDoc.data());
      
      setModules([...modules, { id: docRef.id, ...moduleData, lessonCount: 0 }]);
      setModuleForm({ title: '', description: '' });
      setShowModuleForm(false);
      setSuccessMessage('Module added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error adding module:', error);
      alert('Failed to add module: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;

    try {
      const lessonsToDelete = lessons.filter((l) => l.moduleId === moduleId);
      for (const lesson of lessonsToDelete) {
        await deleteDoc(doc(db, 'lessons', lesson.id));
      }
      await deleteDoc(doc(db, 'modules', moduleId));
      const newLessons = lessons.filter((l) => l.moduleId !== moduleId);
      setLessons(newLessons);
      setModules(modules.filter((m) => m.id !== moduleId));
      
      // Update course lessonCount after deleting module
      if (selectedCourseId) {
        const courseRef = doc(db, 'courses', selectedCourseId);
        await updateDoc(courseRef, { lessonCount: newLessons.length });
      }
      
      setSuccessMessage('Module deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module: ' + error.message);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonForm.title || !selectedModuleId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const moduleLessons = lessons.filter((l) => l.moduleId === selectedModuleId);
      const lessonData = {
        courseId: selectedCourseId,
        moduleId: selectedModuleId,
        title: lessonForm.title,
        description: lessonForm.description || '',
        type: lessonForm.type,
        content: lessonForm.content || '',
        duration: lessonForm.duration || 0,
        isFree: lessonForm.isFree || false,
        order: moduleLessons.length + 1,
        createdAt: new Date(),
      };

      console.log('Saving lesson data:', lessonData);
      
      // 1. Save lesson to root lessons collection
      const docRef = await addDoc(collection(db, 'lessons'), lessonData);
      console.log('Lesson added with ID:', docRef.id);
      
      const savedDoc = await getDoc(docRef);
      console.log('Saved lesson data:', savedDoc.data());
      
      const newLessons = [...lessons, { id: docRef.id, ...lessonData }];
      setLessons(newLessons);

      // 2. Update module's lessonCount
      const moduleRef = doc(db, 'modules', selectedModuleId);
      await updateDoc(moduleRef, { lessonCount: moduleLessons.length + 1 });

      // 3. Update module in state
      setModules(
        modules.map((m) =>
          m.id === selectedModuleId ? { ...m, lessonCount: moduleLessons.length + 1 } : m
        )
      );

      // 4. UPDATE COURSE'S LESSON COUNT (Like DEPORESTATION 2)
      const courseLessons = newLessons.filter((l) => l.courseId === selectedCourseId);
      const courseRef = doc(db, 'courses', selectedCourseId);
      await updateDoc(courseRef, { lessonCount: courseLessons.length });
      console.log('Course lessonCount updated to:', courseLessons.length);

      // 5. Update course in local state
      setCourses(
        courses.map((c) =>
          c.id === selectedCourseId ? { ...c, lessonCount: courseLessons.length } : c
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
      setSuccessMessage('Lesson added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error adding lesson:', error);
      alert('Failed to add lesson: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;

    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
      const newLessons = lessons.filter((l) => l.id !== lessonId);
      setLessons(newLessons);
      
      // Update course lessonCount
      if (selectedCourseId) {
        const courseLessons = newLessons.filter((l) => l.courseId === selectedCourseId);
        const courseRef = doc(db, 'courses', selectedCourseId);
        await updateDoc(courseRef, { lessonCount: courseLessons.length });
        
        // Update course in local state
        setCourses(
          courses.map((c) =>
            c.id === selectedCourseId ? { ...c, lessonCount: courseLessons.length } : c
          )
        );
      }
      
      setSuccessMessage('Lesson deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson: ' + error.message);
    }
  };

  const getLessonsForModule = (moduleId: string) => {
    return lessons.filter((l) => l.moduleId === moduleId);
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'text':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />;
      case 'quiz':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      case 'assignment':
        return <PenTool className="h-4 w-4 text-purple-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-gray-500" />;
    }
  };

  const toggleModule = (moduleId: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

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
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'New Course'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          {debugInfo}
        </div>
      )}

      {/* Create Course Form */}
      {showCreateForm && (
        <Card
          className={`p-6 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Create New Course</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title *</label>
              <Input
                placeholder="Course title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <Input
                placeholder="e.g., Climate Science"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Price (N)</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Duration (hours)</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                }`}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground">Course Image</label>
            <div className="mt-2">
              {formData.imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={formData.imagePreview}
                    alt="Course preview"
                    className="w-40 h-28 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition hover:border-green-500 ${
                    isDarkMode ? 'border-gray-600 hover:border-green-400' : 'border-gray-300'
                  }`}
                >
                  <Github className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload course image to GitHub</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG up to 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Description *</label>
            <textarea
              placeholder="Course description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
              }`}
              rows={3}
            />
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-700 hover:bg-green-800"
              onClick={handleCreateCourse}
              disabled={uploadingImage || !formData.title || !formData.description}
            >
              {uploadingImage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex justify-between items-center">
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing <span className="font-semibold">{filteredCourses.length}</span> of {courses.length} courses
        </p>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No courses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourse === course.id;

            return (
              <Card
                key={course.id}
                className={`overflow-hidden transition ${
                  isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'
                }`}
              >
                {/* Course Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => toggleCourseExpand(course.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={
                        course.imageUrl ||
                        'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80'
                      }
                      alt={course.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {course.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            course.level === 'beginner'
                              ? 'bg-green-100 text-green-800'
                              : course.level === 'intermediate'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {course.level || 'beginner'}
                        </span>
                        <span className="text-muted-foreground">{course.category || 'Uncategorized'}</span>
                        <span className="text-muted-foreground">
                          {course.price === 0 ? 'Free' : `N${course.price}`}
                        </span>
                        <span className="text-muted-foreground">
                          {course.duration || 0}h - {course.totalStudents || 0} students
                        </span>
                        <span className="text-muted-foreground">
                          {course.lessonCount || 0} lessons
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            course.isPublished !== false
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}
                        >
                          {course.isPublished !== false ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
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
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      </div>
                    ) : (
                      <>
                        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {course.description}
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Course Content ({modules.length} modules, {lessons.length} lessons)
                            </h4>
                            <div className="flex gap-2">
                              {!showModuleForm && (
                                <Button
                                  size="sm"
                                  className="bg-green-700 hover:bg-green-800"
                                  onClick={() => {
                                    setModuleForm({ title: '', description: '' });
                                    setShowModuleForm(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Module
                                </Button>
                              )}
                              {!showLessonForm && modules.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedModuleId(modules[0].id);
                                    setLessonForm({
                                      title: '',
                                      description: '',
                                      type: 'video',
                                      content: '',
                                      duration: 0,
                                      isFree: false,
                                    });
                                    setShowLessonForm(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Lesson
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Add Module Form */}
                          {showModuleForm && (
                            <Card className={isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50'}>
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  <Input
                                    placeholder="Module Title *"
                                    value={moduleForm.title}
                                    onChange={(e) =>
                                      setModuleForm({ ...moduleForm, title: e.target.value })
                                    }
                                    className={isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}
                                  />
                                  <Input
                                    placeholder="Description (optional)"
                                    value={moduleForm.description}
                                    onChange={(e) =>
                                      setModuleForm({ ...moduleForm, description: e.target.value })
                                    }
                                    className={isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-green-700 hover:bg-green-800"
                                      onClick={handleAddModule}
                                      disabled={saving}
                                    >
                                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                      Add Module
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setShowModuleForm(false);
                                        setModuleForm({ title: '', description: '' });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Modules List */}
                          {modules.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No modules yet. Add your first module!
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {modules.map((module) => {
                                const moduleLessons = getLessonsForModule(module.id);
                                const isModuleExpanded = expandedModules.has(module.id);

                                return (
                                  <div
                                    key={module.id}
                                    className={`rounded-lg border ${
                                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`}
                                  >
                                    {/* Module Header */}
                                    <div
                                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                      onClick={() => toggleModule(module.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isModuleExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <BookOpen className="h-4 w-4 text-green-500" />
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {module.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          ({module.lessonCount || 0} lessons)
                                        </span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setSelectedModuleId(module.id);
                                            setLessonForm({
                                              title: '',
                                              description: '',
                                              type: 'video',
                                              content: '',
                                              duration: 0,
                                              isFree: false,
                                            });
                                            setShowLessonForm(true);
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() => handleDeleteModule(module.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Module Lessons */}
                                    {isModuleExpanded && moduleLessons.length > 0 && (
                                      <div
                                        className={`p-3 pt-0 space-y-1.5 ${
                                          isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'
                                        }`}
                                      >
                                        {moduleLessons.map((lesson) => (
                                          <div
                                            key={lesson.id}
                                            className={`flex items-center justify-between p-2 rounded-lg ${
                                              isDarkMode ? 'bg-gray-700/30' : 'bg-white'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              {getLessonTypeIcon(lesson.type)}
                                              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {lesson.title}
                                              </span>
                                              {lesson.isFree && (
                                                <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                                  Free
                                                </span>
                                              )}
                                              {lesson.duration > 0 && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                  <Clock className="h-3 w-3" /> {lesson.duration} min
                                                </span>
                                              )}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-red-600 hover:text-red-700"
                                              onClick={() => handleDeleteLesson(lesson.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add Lesson Form */}
                          {showLessonForm && (
                            <Card className={isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50'}>
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs font-medium text-foreground">Lesson Title *</label>
                                      <Input
                                        placeholder="Lesson title"
                                        value={lessonForm.title}
                                        onChange={(e) =>
                                          setLessonForm({ ...lessonForm, title: e.target.value })
                                        }
                                        className={`mt-1 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-foreground">Type</label>
                                      <select
                                        value={lessonForm.type}
                                        onChange={(e) =>
                                          setLessonForm({ ...lessonForm, type: e.target.value as Lesson['type'] })
                                        }
                                        className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                                          isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'
                                        }`}
                                      >
                                        <option value="video">Video</option>
                                        <option value="text">Text</option>
                                        <option value="pdf">PDF</option>
                                        <option value="quiz">Quiz</option>
                                        <option value="assignment">Assignment</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-foreground">Content URL or Text</label>
                                    <Input
                                      placeholder={
                                        lessonForm.type === 'video'
                                          ? 'https://www.youtube.com/watch?v=...'
                                          : 'Enter content...'
                                      }
                                      value={lessonForm.content}
                                      onChange={(e) =>
                                        setLessonForm({ ...lessonForm, content: e.target.value })
                                      }
                                      className={`mt-1 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs font-medium text-foreground">Duration (min)</label>
                                      <Input
                                        type="number"
                                        placeholder="10"
                                        value={lessonForm.duration}
                                        onChange={(e) =>
                                          setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) || 0 })
                                        }
                                        className={`mt-1 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 mt-6">
                                      <input
                                        type="checkbox"
                                        id="isFree"
                                        checked={lessonForm.isFree}
                                        onChange={(e) =>
                                          setLessonForm({ ...lessonForm, isFree: e.target.checked })
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-green-600"
                                      />
                                      <label htmlFor="isFree" className="text-sm text-foreground">
                                        Free Preview
                                      </label>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-green-700 hover:bg-green-800"
                                      onClick={handleAddLesson}
                                      disabled={saving}
                                    >
                                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                      Add Lesson
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setShowLessonForm(false);
                                        setLessonForm({
                                          title: '',
                                          description: '',
                                          type: 'video',
                                          content: '',
                                          duration: 0,
                                          isFree: false,
                                        });
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
          })}
        </div>
      )}
    </div>
  );
} 
  
 