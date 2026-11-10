'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Users, Mail, GraduationCap } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

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
  instructorName?: string;
};

export default function LecturerStudentsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<LecturerCourse[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.name) {
        setStudents([]);
        setCourses([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch the lecturer's courses.
        const coursesQuery = query(
          collection(db, 'courses'),
          where('instructorName', '==', user.name)
        );

        const coursesSnapshot = await getDocs(coursesQuery);

        const coursesData: LecturerCourse[] = coursesSnapshot.docs.map(
          (document) => ({
            ...document.data(),
            id: document.id,
          })
        );

        setCourses(coursesData);

        // Fetch all users and identify students and professionals.
        const usersSnapshot = await getDocs(collection(db, 'users'));

        const usersData: Student[] = usersSnapshot.docs.map((document) => ({
          ...document.data(),
          id: document.id,
        })) as Student[];

        const studentUsers = usersData.filter(
          (student) =>
            student.role === 'student' ||
            student.role === 'professional'
        );

        // Keep only users enrolled in this lecturer's courses.
        const enrolledStudents = studentUsers.filter((student) =>
          coursesData.some((course) =>
            student.enrolledCourses?.includes(course.id)
          )
        );

        setStudents(enrolledStudents);
      } catch (error) {
        console.error('Error fetching students and courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.name]);

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();

    return (
      student.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    );
  });

  const getStudentCourses = (studentId: string): LecturerCourse[] => {
    const student = students.find((item) => item.id === studentId);

    if (!student) {
      return [];
    }

    return courses.filter((course) =>
      student.enrolledCourses?.includes(course.id)
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          My Students
        </h1>

        <p
          className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Manage and track your enrolled students
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search students by name or email..."
          className={`pl-10 ${
            isDarkMode ? 'border-gray-700 bg-gray-800 text-white' : ''
          }`}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={`rounded-lg p-4 text-center ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <Users className="mx-auto mb-2 h-6 w-6 text-green-600" />

          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {students.length}
          </p>

          <p
            className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Total Students
          </p>
        </div>

        <div
          className={`rounded-lg p-4 text-center ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <GraduationCap className="mx-auto mb-2 h-6 w-6 text-blue-600" />

          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {courses.length}
          </p>

          <p
            className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Active Courses
          </p>
        </div>

        <div
          className={`rounded-lg p-4 text-center ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <Mail className="mx-auto mb-2 h-6 w-6 text-purple-600" />

          <p
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            -
          </p>

          <p
            className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Messages
          </p>
        </div>
      </div>

      {/* Students Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const studentCourses = getStudentCourses(student.id);

            return (
              <Card
                key={student.id}
                className={`transition hover:shadow-lg ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                      {student.name?.charAt(0) || 'S'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3
                        className={`truncate font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {student.name || 'Student'}
                      </h3>

                      <p
                        className={`truncate text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {student.email || 'No email provided'}
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {studentCourses.length} course(s) enrolled
                      </p>
                    </div>
                  </div>

                  {studentCourses.length > 0 && (
                    <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        Enrolled Courses:
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {studentCourses.slice(0, 2).map((course) => (
                          <span
                            key={course.id}
                            className="max-w-[150px] truncate rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
                          >
                            {course.title || 'Untitled Course'}
                          </span>
                        ))}

                        {studentCourses.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{studentCourses.length - 2} more
                          </span>
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
        <Card
          className={`py-12 text-center ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}
        >
          <CardContent>
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />

            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              {searchTerm
                ? 'No students match your search.'
                : 'No students enrolled yet'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}