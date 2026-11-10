'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Mail,
  BookOpen,
  Loader2,
  TrendingUp,
  DollarSign,
  Star,
  Calendar,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Github,
  Edit2,
  Save,
  X,
  Bell,
  Moon,
  ChevronRight,
  GraduationCap,
  Users,
  Banknote,
  CheckCircle,
  Camera,
} from 'lucide-react';

import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  getDocs,
  updateDoc,
  query,
  where,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type BankDetails = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
};

type LecturerCourse = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  level?: string;
  duration?: number;
  price?: number;
  totalStudents?: number;
  lessonCount?: number;
  rating?: number;
  completedCount?: number;
  [key: string]: unknown;
};

export default function LecturerProfilePage() {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isDarkMode = theme === 'dark';

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [linkedin, setLinkedin] = useState(user?.linkedin || '');
  const [twitter, setTwitter] = useState(user?.twitter || '');
  const [github, setGithub] = useState(user?.github || '');

  const [successMessage, setSuccessMessage] = useState('');
  const [createdCoursesData, setCreatedCoursesData] = useState<
    LecturerCourse[]
  >([]);

  const [totalStudents, setTotalStudents] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [studentSatisfaction, setStudentSatisfaction] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.avatar || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Bank details
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
  });
  const [bankDetailsSaved, setBankDetailsSaved] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // Course modal
  const [viewingCourse, setViewingCourse] =
    useState<LecturerCourse | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setName(user.name || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setWebsite(user.website || '');
    setLinkedin(user.linkedin || '');
    setTwitter(user.twitter || '');
    setGithub(user.github || '');
    setProfileImage(user.avatar || '');

    void fetchCreatedCourses();
    void fetchBankDetails();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchBankDetails = async () => {
    if (!user) return;

    try {
      const settingsRef = doc(db, 'lecturerSettings', user.uid);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();

        setBankDetails({
          accountName:
            typeof data.accountName === 'string'
              ? data.accountName
              : '',
          accountNumber:
            typeof data.accountNumber === 'string'
              ? data.accountNumber
              : '',
          bankName:
            typeof data.bankName === 'string' ? data.bankName : '',
          bankCode:
            typeof data.bankCode === 'string' ? data.bankCode : '',
        });

        setBankDetailsSaved(true);
      } else {
        setBankDetailsSaved(false);
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    }
  };

  const saveBankDetails = async () => {
    if (!user) return;

    if (
      !bankDetails.accountName.trim() ||
      !bankDetails.accountNumber.trim() ||
      !bankDetails.bankName.trim()
    ) {
      alert('Please fill in all bank details fields');
      return;
    }

    setSavingBank(true);

    try {
      const settingsRef = doc(db, 'lecturerSettings', user.uid);

      await setDoc(
        settingsRef,
        {
          ...bankDetails,
          updatedAt: new Date(),
          userId: user.uid,
          email: user.email || '',
          name: user.name || '',
        },
        { merge: true }
      );

      setBankDetailsSaved(true);
      setShowBankForm(false);
      alert('Bank details saved successfully!');
    } catch (error) {
      console.error('Error saving bank details:', error);
      alert('Failed to save bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const fetchCreatedCourses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const coursesQuery = query(
        collection(db, 'courses'),
        where('instructorName', '==', user.name)
      );

      const querySnapshot = await getDocs(coursesQuery);

      const courses: LecturerCourse[] = querySnapshot.docs.map(
        (courseDoc) => {
          const data = courseDoc.data();

          return {
            ...data,
            id: courseDoc.id,
            title:
              typeof data.title === 'string'
                ? data.title
                : 'Untitled Course',
            description:
              typeof data.description === 'string'
                ? data.description
                : '',
            imageUrl:
              typeof data.imageUrl === 'string'
                ? data.imageUrl
                : '',
            level:
              typeof data.level === 'string'
                ? data.level
                : 'beginner',
            duration:
              typeof data.duration === 'number'
                ? data.duration
                : 0,
            price:
              typeof data.price === 'number'
                ? data.price
                : 0,
            totalStudents:
              typeof data.totalStudents === 'number'
                ? data.totalStudents
                : 0,
            lessonCount:
              typeof data.lessonCount === 'number'
                ? data.lessonCount
                : 0,
            rating:
              typeof data.rating === 'number'
                ? data.rating
                : 0,
            completedCount:
              typeof data.completedCount === 'number'
                ? data.completedCount
                : 0,
          };
        }
      );

      setCreatedCoursesData(courses);

      const students = courses.reduce(
        (sum, course) => sum + (course.totalStudents ?? 0),
        0
      );

      const lessons = courses.reduce(
        (sum, course) => sum + (course.lessonCount ?? 0),
        0
      );

      const revenue = courses.reduce(
        (sum, course) =>
          sum +
          (course.price ?? 0) * (course.totalStudents ?? 0),
        0
      );

      const ratedCourses = courses.filter(
        (course) => (course.rating ?? 0) > 0
      );

      const avgRating =
        ratedCourses.length > 0
          ? ratedCourses.reduce(
              (sum, course) => sum + (course.rating ?? 0),
              0
            ) / ratedCourses.length
          : 0;

      const totalCompletions = courses.reduce(
        (sum, course) => sum + (course.completedCount ?? 0),
        0
      );

      const calculatedCompletionRate =
        students > 0
          ? Math.min(
              100,
              Math.round((totalCompletions / students) * 100)
            )
          : 0;

      const calculatedSatisfaction =
        avgRating > 0
          ? Math.round((avgRating / 5) * 100)
          : 0;

      // Growth requires historical data to calculate accurately.
      // Do not generate a random percentage.
      const calculatedGrowthRate = 0;

      setTotalStudents(students);
      setTotalLessons(lessons);
      setTotalRevenue(revenue);
      setAverageRating(Number(avgRating.toFixed(1)));
      setCompletionRate(calculatedCompletionRate);
      setStudentSatisfaction(calculatedSatisfaction);
      setGrowthRate(calculatedGrowthRate);
    } catch (error) {
      console.error('Error fetching created courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        name,
        bio,
        location,
        website,
        linkedin,
        twitter,
        github,
      });

      await updateProfile(name, bio);

      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    setSuccessMessage('Uploading...');

    try {
      let imageUrl: string;

      try {
        const imageRef = ref(
          storage,
          `profile-pictures/${user.uid}`
        );

        await uploadBytes(imageRef, file);
        imageUrl = await getDownloadURL(imageRef);
      } catch (storageError) {
        console.error(
          'Firebase Storage upload failed:',
          storageError
        );

        throw new Error(
          'Image upload failed. Please check your storage configuration and try again.'
        );
      }

      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, { avatar: imageUrl });

      setProfileImage(imageUrl);

      setSuccessMessage('Profile picture updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to upload image. Please try again.'
      );
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const viewCourseDetails = (course: LecturerCourse) => {
    setViewingCourse(course);
  };

  const getInitials = (value: string) =>
    value?.charAt(0)?.toUpperCase() || 'U';

  if (loading) {
    return (
      <div
        className={`flex min-h-[400px] items-center justify-center ${
          isDarkMode ? 'bg-gray-900' : ''
        }`}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    );
  }

  const joinDate = new Date().getFullYear();

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? 'bg-gray-900'
          : 'bg-gradient-to-br from-gray-50 to-gray-100'
      }`}
    >
      {/* Hero Banner */}
      <div className="relative h-48 bg-gradient-to-r from-green-700 via-green-800 to-emerald-900">
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="relative">
            {profileImage ? (
              <img
                src={profileImage}
                alt={user?.name || 'Lecturer'}
                className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-green-600 text-4xl font-bold text-white shadow-xl">
                {getInitials(user?.name || '')}
              </div>
            )}

            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-green-600 p-2 shadow-lg transition hover:bg-green-700">
              <Camera className="h-4 w-4 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </label>

            {uploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-20">
        {/* Profile Header */}
        <div className="mb-8 text-center">
          <h1
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {user?.name}
          </h1>

          <p
            className={`mt-1 text-sm capitalize ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Lecturer • Member since {joinDate}
          </p>

          {user?.bio && (
            <p
              className={`mx-auto mt-2 max-w-md text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {user.bio}
            </p>
          )}
        </div>

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList
            className={`mx-auto mb-6 grid w-full max-w-md grid-cols-4 ${
              isDarkMode ? 'bg-gray-800' : ''
            }`}
          >
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">
              Courses ({createdCoursesData.length})
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {/* Statistics */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Card
                    className={`text-center transition hover:shadow-lg ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : ''
                    }`}
                  >
                    <CardContent className="pt-6">
                      <BookOpen className="mx-auto mb-2 h-8 w-8 text-green-600" />
                      <p
                        className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {createdCoursesData.length}
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        Courses Created
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`text-center transition hover:shadow-lg ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : ''
                    }`}
                  >
                    <CardContent className="pt-6">
                      <Users className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                      <p
                        className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {totalStudents}
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        Total Students
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`text-center transition hover:shadow-lg ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : ''
                    }`}
                  >
                    <CardContent className="pt-6">
                      <GraduationCap className="mx-auto mb-2 h-8 w-8 text-purple-600" />
                      <p
                        className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {totalLessons}
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        Total Lessons
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`text-center transition hover:shadow-lg ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : ''
                    }`}
                  >
                    <CardContent className="pt-6">
                      <Star className="mx-auto mb-2 h-8 w-8 text-yellow-600" />
                      <p
                        className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {averageRating || 'N/A'}
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        Average Rating
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Teaching Analytics */}
                <Card
                  className={`mb-6 ${
                    isDarkMode
                      ? 'border-gray-700 bg-gray-800'
                      : ''
                  }`}
                >
                  <CardHeader>
                    <CardTitle
                      className={isDarkMode ? 'text-white' : ''}
                    >
                      Teaching Analytics
                    </CardTitle>
                    <CardDescription
                      className={isDarkMode ? 'text-gray-400' : ''}
                    >
                      Your impact as an educator
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span
                            className={
                              isDarkMode ? 'text-gray-300' : ''
                            }
                          >
                            Course Completion Rate
                          </span>
                          <span className="font-semibold text-green-600">
                            {completionRate}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-green-600"
                            style={{
                              width: `${completionRate}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span
                            className={
                              isDarkMode ? 'text-gray-300' : ''
                            }
                          >
                            Student Satisfaction
                          </span>
                          <span className="font-semibold text-blue-600">
                            {studentSatisfaction}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{
                              width: `${studentSatisfaction}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div
                          className={`rounded-lg p-3 text-center ${
                            isDarkMode ? 'bg-gray-700' : 'bg-green-50'
                          }`}
                        >
                          <DollarSign className="mx-auto mb-1 h-5 w-5 text-green-600" />
                          <p
                            className={`text-lg font-bold ${
                              isDarkMode
                                ? 'text-white'
                                : 'text-gray-900'
                            }`}
                          >
                            ₦{totalRevenue.toLocaleString()}
                          </p>
                          <p
                            className={`text-xs ${
                              isDarkMode
                                ? 'text-gray-400'
                                : 'text-gray-500'
                            }`}
                          >
                            Estimated Revenue
                          </p>
                        </div>

                        <div
                          className={`rounded-lg p-3 text-center ${
                            isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
                          }`}
                        >
                          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                          <p
                            className={`text-lg font-bold ${
                              isDarkMode
                                ? 'text-white'
                                : 'text-gray-900'
                            }`}
                          >
                            {growthRate}%
                          </p>
                          <p
                            className={`text-xs ${
                              isDarkMode
                                ? 'text-gray-400'
                                : 'text-gray-500'
                            }`}
                          >
                            Growth Rate
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Courses */}
                <Card
                  className={
                    isDarkMode
                      ? 'border-gray-700 bg-gray-800'
                      : ''
                  }
                >
                  <CardHeader>
                    <CardTitle
                      className={isDarkMode ? 'text-white' : ''}
                    >
                      Recent Courses
                    </CardTitle>
                    <CardDescription
                      className={isDarkMode ? 'text-gray-400' : ''}
                    >
                      Your courses
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {createdCoursesData.length > 0 ? (
                      <div className="space-y-3">
                        {createdCoursesData.slice(0, 3).map((course) => (
                          <div
                            key={course.id}
                            className={`flex items-center justify-between rounded-lg p-3 transition ${
                              isDarkMode
                                ? 'bg-gray-700 hover:bg-gray-600'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                <BookOpen className="h-5 w-5 text-green-600" />
                              </div>

                              <div>
                                <p
                                  className={`font-medium ${
                                    isDarkMode
                                      ? 'text-white'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {course.title}
                                </p>
                                <p
                                  className={`text-xs ${
                                    isDarkMode
                                      ? 'text-gray-400'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {course.totalStudents ?? 0} students
                                  {' • '}
                                  {course.lessonCount ?? 0} lessons
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewCourseDetails(course)}
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <BookOpen className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p
                          className={
                            isDarkMode
                              ? 'text-gray-400'
                              : 'text-gray-500'
                          }
                        >
                          No courses created yet
                        </p>
                        <Link href="/lecturer">
                          <Button className="mt-3 bg-green-700">
                            Create Your First Course
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <Card
                  className={
                    isDarkMode
                      ? 'border-gray-700 bg-gray-800'
                      : ''
                  }
                >
                  <CardHeader>
                    <CardTitle
                      className={isDarkMode ? 'text-white' : ''}
                    >
                      Contact Information
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span
                        className={
                          isDarkMode
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }
                      >
                        {user?.email}
                      </span>
                    </div>

                    {location && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span
                          className={
                            isDarkMode
                              ? 'text-gray-300'
                              : 'text-gray-600'
                          }
                        >
                          {location}
                        </span>
                      </div>
                    )}

                    {website && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-green-600 hover:underline"
                        >
                          {website}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span
                        className={
                          isDarkMode
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }
                      >
                        Joined {joinDate}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {(linkedin || twitter || github) && (
                  <Card
                    className={
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : ''
                    }
                  >
                    <CardHeader>
                      <CardTitle
                        className={isDarkMode ? 'text-white' : ''}
                      >
                        Social Profiles
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {linkedin && (
                        <a
                          href={linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 text-sm transition ${
                            isDarkMode
                              ? 'text-gray-300 hover:text-blue-400'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          <Linkedin className="h-4 w-4" />
                          <span>LinkedIn Profile</span>
                          <ChevronRight className="ml-auto h-3 w-3" />
                        </a>
                      )}

                      {twitter && (
                        <a
                          href={twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 text-sm transition ${
                            isDarkMode
                              ? 'text-gray-300 hover:text-blue-400'
                              : 'text-gray-600 hover:text-blue-400'
                          }`}
                        >
                          <Twitter className="h-4 w-4" />
                          <span>Twitter Profile</span>
                          <ChevronRight className="ml-auto h-3 w-3" />
                        </a>
                      )}

                      {github && (
                        <a
                          href={github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 text-sm transition ${
                            isDarkMode
                              ? 'text-gray-300 hover:text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Github className="h-4 w-4" />
                          <span>GitHub Profile</span>
                          <ChevronRight className="ml-auto h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <h2
              className={`mb-6 text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              My Courses
            </h2>

            {createdCoursesData.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {createdCoursesData.map((course) => (
                  <Card
                    key={course.id}
                    className={`group overflow-hidden transition-all duration-300 hover:shadow-xl ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : ''
                    }`}
                  >
                    <div className="relative h-40 overflow-hidden bg-gradient-to-r from-green-700 via-green-800 to-emerald-900">
                      <img
                        src={
                          course.imageUrl ||
                          'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'
                        }
                        alt={course.title || 'Course'}
                        className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
                    </div>

                    <CardContent className="space-y-3 pt-4">
                      <div>
                        <h3
                          className={`line-clamp-1 font-semibold ${
                            isDarkMode
                              ? 'text-white'
                              : 'text-gray-900'
                          }`}
                        >
                          {course.title}
                        </h3>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs capitalize text-green-700">
                            {course.level}
                          </span>
                          <span
                            className={`text-xs ${
                              isDarkMode
                                ? 'text-gray-400'
                                : 'text-gray-500'
                            }`}
                          >
                            {course.duration ?? 0} hours
                          </span>
                        </div>

                        <div
                          className={`mt-2 flex flex-wrap gap-3 text-xs ${
                            isDarkMode
                              ? 'text-gray-400'
                              : 'text-gray-500'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {course.totalStudents ?? 0} students
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {course.lessonCount ?? 0} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400" />
                            {course.rating || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => viewCourseDetails(course)}
                        className="w-full bg-green-700 hover:bg-green-800"
                        size="sm"
                      >
                        View Course
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card
                className={`py-12 text-center ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-800'
                    : ''
                }`}
              >
                <CardContent>
                  <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <h3
                    className={`mb-2 text-xl font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    No courses created yet
                  </h3>
                  <p
                    className={
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }
                  >
                    Start creating courses to share your knowledge
                  </p>
                  <Link href="/lecturer">
                    <Button className="mt-4 bg-green-700">
                      Create Course
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              <Card
                className={
                  isDarkMode
                    ? 'border-gray-700 bg-gray-800'
                    : ''
                }
              >
                <CardHeader>
                  <CardTitle
                    className={isDarkMode ? 'text-white' : ''}
                  >
                    Payment Settings
                  </CardTitle>
                  <CardDescription
                    className={isDarkMode ? 'text-gray-400' : ''}
                  >
                    Set up your bank account to receive payouts
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {!bankDetailsSaved && !showBankForm ? (
                    <div className="py-8 text-center">
                      <Banknote className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
                      <p className="mb-4 text-muted-foreground">
                        No bank account added yet
                      </p>
                      <Button
                        onClick={() => setShowBankForm(true)}
                        className="bg-green-700 hover:bg-green-800"
                      >
                        Add Bank Account
                      </Button>
                    </div>
                  ) : showBankForm ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Account Holder Name *
                        </label>
                        <Input
                          value={bankDetails.accountName}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              accountName: e.target.value,
                            })
                          }
                          placeholder="Enter your full name as on bank account"
                          className={
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700'
                              : ''
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Account Number *
                        </label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          value={bankDetails.accountNumber}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              accountNumber: e.target.value.replace(
                                /\D/g,
                                ''
                              ),
                            })
                          }
                          placeholder="10-digit account number"
                          className={
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700'
                              : ''
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Bank Name *
                        </label>
                        <select
                          value={bankDetails.bankName}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              bankName: e.target.value,
                            })
                          }
                          className={`w-full rounded-lg border px-3 py-2 text-sm ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Bank</option>
                          <option value="Access Bank">Access Bank</option>
                          <option value="First Bank">First Bank</option>
                          <option value="GTBank">GTBank</option>
                          <option value="UBA">UBA</option>
                          <option value="Zenith Bank">Zenith Bank</option>
                          <option value="Union Bank">Union Bank</option>
                          <option value="Fidelity Bank">Fidelity Bank</option>
                          <option value="Polaris Bank">Polaris Bank</option>
                          <option value="Stanbic IBTC">Stanbic IBTC</option>
                          <option value="Sterling Bank">Sterling Bank</option>
                          <option value="Ecobank">Ecobank</option>
                          <option value="Providus Bank">Providus Bank</option>
                          <option value="Kuda Bank">Kuda Bank</option>
                          <option value="Moniepoint">Moniepoint</option>
                          <option value="Opay">Opay</option>
                        </select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={saveBankDetails}
                          disabled={savingBank}
                          className="bg-green-700 hover:bg-green-800"
                        >
                          {savingBank ? 'Saving...' : 'Save Bank Details'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowBankForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        className={`rounded-lg p-4 ${
                          isDarkMode ? 'bg-gray-700' : 'bg-green-50'
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-foreground">
                            Bank Details Saved
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Account Name:
                            </span>
                            <span className="break-all text-right font-medium text-foreground">
                              {bankDetails.accountName}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Account Number:
                            </span>
                            <span className="font-medium text-foreground">
                              {bankDetails.accountNumber}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Bank:
                            </span>
                            <span className="font-medium text-foreground">
                              {bankDetails.bankName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setShowBankForm(true)}
                        className="w-full"
                      >
                        Update Bank Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Earnings Summary */}
              <Card
                className={
                  isDarkMode
                    ? 'border-gray-700 bg-gray-800'
                    : ''
                }
              >
                <CardHeader>
                  <CardTitle
                    className={isDarkMode ? 'text-white' : ''}
                  >
                    Earnings Summary
                  </CardTitle>
                  <CardDescription
                    className={isDarkMode ? 'text-gray-400' : ''}
                  >
                    Estimated earnings based on course data
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div
                      className={`rounded-lg p-4 text-center ${
                        isDarkMode ? 'bg-gray-700' : 'bg-green-50'
                      }`}
                    >
                      <DollarSign className="mx-auto mb-2 h-8 w-8 text-green-600" />
                      <p
                        className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        ₦{totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Estimated Course Revenue
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Before platform commission
                      </p>
                    </div>

                    <div
                      className={`rounded-lg p-4 text-center ${
                        isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
                      }`}
                    >
                      <Banknote className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                      <p
                        className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        ₦{Math.round(totalRevenue * 0.7).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Estimated Lecturer Share
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Based on a 70% share, not verified payout balance
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Lecturer Share
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Illustrative 70% share of course revenue
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          Platform Share
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Illustrative 30% share
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card
              className={
                isDarkMode
                  ? 'border-gray-700 bg-gray-800'
                  : ''
              }
            >
              <CardHeader>
                <CardTitle
                  className={isDarkMode ? 'text-white' : ''}
                >
                  Account Settings
                </CardTitle>
                <CardDescription
                  className={isDarkMode ? 'text-gray-400' : ''}
                >
                  Manage your account information
                </CardDescription>
              </CardHeader>

              <CardContent>
                {!isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Full Name
                      </label>
                      <p
                        className={`mt-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {user?.name}
                      </p>
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Email
                      </label>
                      <p
                        className={`mt-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {user?.email}
                      </p>
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Role
                      </label>
                      <p
                        className={`mt-1 capitalize ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {user?.role}
                      </p>
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Bio
                      </label>
                      <p
                        className={`mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {user?.bio || 'No bio added'}
                      </p>
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Location
                      </label>
                      <p
                        className={`mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {location || 'Not specified'}
                      </p>
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Website
                      </label>
                      <p
                        className={`mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {website || 'Not specified'}
                      </p>
                    </div>

                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-green-700 hover:bg-green-800"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>

                    {/* Preferences */}
                    <div
                      className={`mt-6 border-t pt-6 ${
                        isDarkMode ? 'border-gray-700' : ''
                      }`}
                    >
                      <h3
                        className={`mb-4 text-lg font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Preferences
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-gray-500" />
                            <span
                              className={`text-sm ${
                                isDarkMode
                                  ? 'text-gray-300'
                                  : 'text-gray-700'
                              }`}
                            >
                              Email Notifications
                            </span>
                          </div>

                          <button
                            type="button"
                            aria-label="Toggle email notifications"
                            aria-pressed={notificationsEnabled}
                            onClick={() =>
                              setNotificationsEnabled(
                                !notificationsEnabled
                              )
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                              notificationsEnabled
                                ? 'bg-green-600'
                                : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                notificationsEnabled
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Moon className="h-5 w-5 text-gray-500" />
                            <span
                              className={`text-sm ${
                                isDarkMode
                                  ? 'text-gray-300'
                                  : 'text-gray-700'
                              }`}
                            >
                              Dark Mode
                            </span>
                          </div>

                          <button
                            type="button"
                            aria-label="Toggle dark mode"
                            aria-pressed={isDarkMode}
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                              isDarkMode
                                ? 'bg-green-600'
                                : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                isDarkMode
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Full Name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`mt-1 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className={`mt-1 w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-green-500 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Location
                      </label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className={`mt-1 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Website
                      </label>
                      <Input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className={`mt-1 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        LinkedIn
                      </label>
                      <Input
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="LinkedIn URL"
                        className={`mt-1 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Twitter
                      </label>
                      <Input
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="Twitter URL"
                        className={`mt-1 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        GitHub
                      </label>
                      <Input
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        placeholder="GitHub URL"
                        className={`mt-1 ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white'
                            : ''
                        }`}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        className="bg-green-700 hover:bg-green-800"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setName(user?.name || '');
                          setBio(user?.bio || '');
                          setLocation(user?.location || '');
                          setWebsite(user?.website || '');
                          setLinkedin(user?.linkedin || '');
                          setTwitter(user?.twitter || '');
                          setGithub(user?.github || '');
                          setIsEditing(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div
                  className={`mt-8 border-t pt-8 ${
                    isDarkMode ? 'border-gray-700' : ''
                  }`}
                >
                  <h3 className="mb-4 text-lg font-semibold text-red-600">
                    Danger Zone
                  </h3>
                  <Button variant="destructive" disabled>
                    Delete Account
                  </Button>
                  <p
                    className={`mt-2 text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    Account deletion is currently disabled
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Course View Modal */}
      {viewingCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewingCourse(null)}
        >
          <div
            className={`max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl p-5 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {viewingCourse.title}
              </h3>

              <button
                type="button"
                aria-label="Close course details"
                onClick={() => setViewingCourse(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <img
                src={
                  viewingCourse.imageUrl ||
                  'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'
                }
                alt={viewingCourse.title || 'Course'}
                className="h-48 w-full rounded-lg object-cover"
              />

              <p
                className={
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }
              >
                {viewingCourse.description}
              </p>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div
                  className={`rounded-lg p-3 text-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Level
                  </span>
                  <p
                    className={`mt-1 text-sm capitalize ${
                      isDarkMode ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {viewingCourse.level || 'Not specified'}
                  </p>
                </div>

                <div
                  className={`rounded-lg p-3 text-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Duration
                  </span>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {viewingCourse.duration ?? 0} hours
                  </p>
                </div>

                <div
                  className={`rounded-lg p-3 text-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Price
                  </span>
                  <p className="mt-1 text-sm font-medium text-green-600">
                    ₦{(viewingCourse.price ?? 0).toLocaleString()}
                  </p>
                </div>

                <div
                  className={`rounded-lg p-3 text-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Students
                  </span>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {viewingCourse.totalStudents ?? 0}
                  </p>
                </div>

                <div
                  className={`rounded-lg p-3 text-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Lessons
                  </span>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {viewingCourse.lessonCount ?? 0}
                  </p>
                </div>

                <div
                  className={`rounded-lg p-3 text-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Rating
                  </span>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {viewingCourse.rating || 'N/A'} ★
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/lecturer" className="flex-1">
                  <Button className="w-full bg-green-700 hover:bg-green-800">
                    Manage Course
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={() => setViewingCourse(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}