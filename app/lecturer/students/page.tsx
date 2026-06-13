'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, Mail, GraduationCap } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

export default function LecturerStudentsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch lecturer's courses
      const q = query(collection(db, 'courses'), where('instructorName', '==', user?.name));
      const coursesSnapshot = await getDocs(q);
      const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesData);

      // Fetch all students
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const studentsData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'student' || u.role === 'professional');
      
      // Filter students enrolled in lecturer's courses
      const enrolledStudents = studentsData.filter(student => 
        coursesData.some(course => student.enrolledCourses?.includes(course.id))
      );
      
      setStudents(enrolledStudents);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentCourses = (studentId: string) => {
    return courses.filter(course => 
      students.find(s => s.id === studentId)?.enrolledCourses?.includes(course.id)
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Students</h1>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage and track your enrolled students</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          placeholder="Search students by name or email..." 
          className={`pl-10 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`} 
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-lg p-4 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{students.length}</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Students</p>
        </div>
        <div className={`rounded-lg p-4 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <GraduationCap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{courses.length}</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Courses</p>
        </div>
        <div className={`rounded-lg p-4 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <Mail className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>-</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Messages</p>
        </div>
      </div>

      {/* Students Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const studentCourses = getStudentCourses(student.id);
            return (
              <Card key={student.id} className={`hover:shadow-lg transition ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                      {student.name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.name || 'Student'}</h3>
                      <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{studentCourses.length} course(s) enrolled</p>
                    </div>
                  </div>
                  {studentCourses.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 mb-2">Enrolled Courses:</p>
                      <div className="flex flex-wrap gap-1">
                        {studentCourses.slice(0, 2).map(course => (
                          <span key={course.id} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full truncate max-w-[150px]">
                            {course.title}
                          </span>
                        ))}
                        {studentCourses.length > 2 && (
                          <span className="text-xs text-gray-500">+{studentCourses.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className={`text-center py-12 ${isDarkMode ? 'bg-gray-800' : ''}`}>
          <CardContent>
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No students enrolled yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}