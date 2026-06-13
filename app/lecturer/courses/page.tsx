'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, Plus, Search, Filter, Upload, X, Trash2, Edit2, List, Users, Star, ChevronDown, Loader2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

export default function LecturerCoursesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const instructorName = user?.name ?? 'Lecturer';
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showLevelFilter, setShowLevelFilter] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', level: 'beginner' as const, price: 0, duration: 0,
  });
  const [imagePreview, setImagePreview] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const levels = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const fetchData = async () => {
    try {
      // Fetch all students first
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const students = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'student' || u.role === 'professional');
      setAllStudents(students);

      // Fetch courses
      const q = query(collection(db, 'courses'), where('instructorName', '==', instructorName));
      const querySnapshot = await getDocs(q);
      
      const coursesData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const lessonsRef = collection(db, 'courses', doc.id, 'lessons');
        const lessonsSnapshot = await getDocs(lessonsRef);
        
        // Calculate real student count for this course
        const enrolledStudents = students.filter(s => s.enrolledCourses?.includes(doc.id)).length;
        
        return {
          id: doc.id,
          ...doc.data(),
          lessonCount: lessonsSnapshot.size,
          image: doc.data().imageUrl || 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80',
          realStudentCount: enrolledStudents,
          level: doc.data().level || 'beginner', // Default to beginner if not set
        };
      }));
      
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!formData.title || !formData.description) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    try {
      setUploadingImage(true);
      let imageUrl = 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80';
      if (selectedImageFile) {
        try { imageUrl = await fileToBase64(selectedImageFile); } catch(e) { console.error(e); }
      }

      const newCourse = {
        title: formData.title,
        description: formData.description,
        category: formData.category || 'Climate',
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
      setFormData({ title: '', description: '', category: '', level: 'beginner', price: 0, duration: 0 });
      setSelectedImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview('');
      showNotification('success', 'Course created successfully!');
    } catch (error) {
      console.error('Error creating course:', error);
      showNotification('error', 'Failed to create course');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      setCourses(courses.filter(c => c.id !== id));
      showNotification('success', 'Course deleted successfully');
    } catch (error) {
      console.error('Error deleting course:', error);
      showNotification('error', 'Failed to delete course');
    }
  };

  // Filter courses by search term AND level
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || c.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-in slide-in-from-right-5">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 text-sm ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <p>{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            My Courses
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage and organize your course content
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)} 
          className="bg-green-700 hover:bg-green-800 whitespace-nowrap shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Course
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Search courses by title or category..." 
            className={`pl-10 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`} 
          />
        </div>
        
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
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowLevelFilter(false)}
              />
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
      </div>

      {/* Filter Stats */}
      <div className="flex justify-between items-center">
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing <span className="font-semibold">{filteredCourses.length}</span> of {courses.length} courses
          {selectedLevel !== 'all' && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
              Filtered by: {levels.find(l => l.value === selectedLevel)?.label}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCourses.map((course) => (
            <Card key={course.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col md:flex-row">
                <div className="md:w-36 h-36 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-semibold text-lg line-clamp-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {course.title}
                    </h3>
                    <Badge level={course.level} />
                  </div>
                  <p className={`text-sm line-clamp-2 mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {course.description}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span>{course.realStudentCount || 0} students</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                      <span>{course.lessonCount || 0} lessons</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{course.rating || 4.5}</span>
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ₦{course.price || 0}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/lecturer/courses/${course.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Course
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteCourse(course.id)} 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
        <Card className={`text-center py-16 ${isDarkMode ? 'bg-gray-800' : ''}`}>
          <CardContent>
            <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {searchTerm || selectedLevel !== 'all' ? 'No matching courses' : 'No courses yet'}
            </h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
          <div className={`rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Create New Course
              </h3>
              <button 
                onClick={() => setShowCreateForm(false)} 
                className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Course Title *
                </label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="e.g., Climate Science 101" 
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                  }`} 
                />
              </div>
              
              <div>
                <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description *
                </label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  rows={3} 
                  placeholder="What will students learn?" 
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                  }`} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <input 
                    type="text" 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    placeholder="e.g., Climate Science" 
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                    }`} 
                  />
                </div>
                
                <div>
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Level
                  </label>
                  <select 
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: e.target.value as any})} 
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
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
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Duration (hours)
                  </label>
                  <input 
                    type="number" 
                    value={formData.duration} 
                    onChange={e => setFormData({...formData, duration: Number(e.target.value)})} 
                    placeholder="Hours" 
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                    }`} 
                  />
                </div>
                
                <div>
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Price (₦)
                  </label>
                  <input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                    placeholder="0 for free" 
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                    }`} 
                  />
                </div>
              </div>
              
              <div>
                <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Course Image
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => { 
                    const file = e.target.files?.[0]; 
                    if(file) { 
                      if(imagePreview) URL.revokeObjectURL(imagePreview); 
                      setSelectedImageFile(file); 
                      setImagePreview(URL.createObjectURL(file)); 
                    } 
                  }} 
                  className="text-sm" 
                />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="h-24 w-full object-cover rounded-lg mt-2" />
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
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Course'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Badge component for level display
const Badge = ({ level }: { level: string }) => {
  const getBadgeStyles = () => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return level || 'Not Set';
    }
  };

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getBadgeStyles()}`}>
      {getLevelLabel()}
    </span>
  );
};