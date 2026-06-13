'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { useTheme } from '@/context/theme-context';

export default function CourseManagement() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner' as const,
    price: 0,
    duration: 0,
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(
    course =>
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCourse = async () => {
    if (!formData.title || !formData.description) return;
    
    try {
      const newCourse = {
        title: formData.title,
        description: formData.description,
        category: formData.category || 'General',
        level: formData.level,
        price: formData.price,
        duration: formData.duration,
        imageUrl: 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80',
        totalStudents: 0,
        rating: 4.5,
        isPublished: true,
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'courses'), newCourse);
      setCourses([{ id: docRef.id, ...newCourse }, ...courses]);
      setFormData({ title: '', description: '', category: '', level: 'beginner', price: 0, duration: 0 });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      setCourses(courses.filter(course => course.id !== id));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

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
          <p className="text-sm text-muted-foreground mt-1">Manage your courses</p>
        </div>
        <Button
          className="bg-green-700 hover:bg-green-800 w-full sm:w-auto"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'New Course'}
        </Button>
      </div>

      {/* Create Course Form */}
      {showCreateForm && (
        <Card className={`p-6 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
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
              <label className="text-sm font-medium text-foreground">Price (₦)</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Duration (hours)</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description *</label>
            <textarea
              placeholder="Course description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
              rows={3}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button className="bg-green-700 hover:bg-green-800" onClick={handleCreateCourse}>
              Create Course
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

      {/* Filter Stats */}
      <div className="flex justify-between items-center">
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing <span className="font-semibold">{filteredCourses.length}</span> of {courses.length} courses
        </p>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No courses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <Card key={course.id} className={`overflow-hidden hover:shadow-lg transition ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="h-32 overflow-hidden">
                <img
                  src={course.imageUrl || 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <h3 className={`font-semibold text-lg mb-1 line-clamp-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {course.title}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                    course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {course.level || 'beginner'}
                  </span>
                  <span className="text-xs text-muted-foreground">{course.category || 'Uncategorized'}</span>
                </div>
                <p className={`text-sm line-clamp-2 mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {course.description}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    {course.price === 0 ? (
                      <span className="text-sm font-semibold text-green-600">Free</span>
                    ) : (
                      <span className="text-sm font-semibold text-green-600">₦{course.price}</span>
                    )}
                    <p className="text-xs text-muted-foreground">{course.duration || 0} hours</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/courses-management/${course.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteCourse(course.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}