'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Users, Clock, DollarSign, Trash2, Eye } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

export default function AdminCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<any[]>([]);

  // Debug: Log the courseId from URL
  console.log('=== DEBUGGING ===');
  console.log('Course ID from URL params:', courseId);

  useEffect(() => {
    fetchCourse();
    fetchAllCourses();
  }, [courseId]);

  const fetchAllCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const courses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title
      }));
      setAllCourses(courses);
      console.log('All available course IDs:', courses.map(c => c.id));
      console.log('Available course titles:', courses.map(c => ({ id: c.id, title: c.title })));
    } catch (error) {
      console.error('Error fetching all courses:', error);
    }
  };

  const fetchCourse = async () => {
    try {
      setLoading(true);
      console.log('Fetching course with ID:', courseId);
      
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      console.log('Document exists?', courseSnap.exists());
      
      if (courseSnap.exists()) {
        setCourse({ id: courseSnap.id, ...courseSnap.data() });
        console.log('Course found:', courseSnap.data().title);
      } else {
        console.log('No course found for ID:', courseId);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      router.push('/admin/courses-management');
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

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">Course Not Found</h2>
        <p className="text-muted-foreground mb-2">Looking for course ID: <strong>{courseId}</strong></p>
        <p className="text-muted-foreground mb-4">Available course IDs in database:</p>
        <ul className="text-sm text-muted-foreground mb-6 max-h-40 overflow-auto">
          {allCourses.map(c => (
            <li key={c.id}>
              <Link href={`/admin/courses-management/${c.id}`} className="text-blue-600 hover:underline">
                {c.id} - {c.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/admin/courses-management">
          <Button className="bg-green-700 hover:bg-green-800">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses-management">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground">Course Details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Course Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium text-foreground">{course.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span className="text-foreground">{course.level || 'beginner'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="text-foreground">₦{course.price || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{course.duration || 0} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={course.isPublished ? 'text-green-600' : 'text-gray-500'}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <p className="text-muted-foreground">{course.description || 'No description available.'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button variant="destructive" onClick={handleDeleteCourse}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete Course
        </Button>
        <Link href={`/courses/${courseId}`} target="_blank">
          {/* <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" /> View on Site
          </Button> */}
        </Link>
      </div>
    </div>
  );
}