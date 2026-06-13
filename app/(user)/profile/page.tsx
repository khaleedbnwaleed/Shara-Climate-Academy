'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Award, Mail, User, BookOpen, Clock, Download, Share2, Camera, Loader2, 
  MapPin, Globe, Linkedin, Twitter, Github, Edit2, Save, X, 
  Bell, Moon, Sun, ChevronRight, Calendar, TrendingUp, Target, Zap
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useTheme } from '@/context/theme-context';

export default function ProfilePage() {
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
  const [completedCoursesData, setCompletedCoursesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLearningHours, setTotalLearningHours] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.avatar || '/default-avatar.png');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const GITHUB_USERNAME = 'sabirmuhdbabangida5855';
  const GITHUB_REPO = 'shara-images';
  const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;

  useEffect(() => {
    if (user?.completedCourses) {
      fetchCompletedCourses();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCompletedCourses = async () => {
    try {
      const completedPromises = (user?.completedCourses || []).map(async (courseId: string) => {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          return { id: courseSnap.id, ...courseSnap.data(), completed: true };
        }
        return null;
      });
      const completed = (await Promise.all(completedPromises)).filter(Boolean);
      setCompletedCoursesData(completed);
      const totalHours = completed.reduce((sum, course) => sum + (course.duration || 0), 0);
      setTotalLearningHours(totalHours);
    } catch (error) {
      console.error('Error fetching completed courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const userRef = doc(db, 'users', user?.uid);
      await updateDoc(userRef, { name, bio, location, website, linkedin, twitter, github });
      await updateProfile(name, bio);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let width = img.width;
          let height = img.height;
          const maxSize = 200;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const uploadToGitHub = async (blob: Blob): Promise<string> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const base64Data = base64.split(',')[1];
    const timestamp = Date.now();
    const filename = `avatars/${user?.uid}/${timestamp}.jpg`;
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload profile picture for ${user?.email}`,
        content: base64Data,
        branch: 'main'
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload to GitHub');
    }
    return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${filename}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (!GITHUB_TOKEN) {
      alert('GitHub token not configured');
      return;
    }
    setUploadingImage(true);
    setSuccessMessage('Uploading to GitHub...');
    try {
      const compressedBlob = await compressImage(file);
      const imageUrl = await uploadToGitHub(compressedBlob);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { avatar: imageUrl });
      setProfileImage(imageUrl);
      if (user) user.avatar = imageUrl;
      setSuccessMessage('Profile picture updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDownloadCertificate = async (course: any) => {
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const certificateId = `${course.id.slice(0, 8)}-${user?.uid?.slice(0, 8)}`;
    
    const loadingToast = document.createElement('div');
    loadingToast.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    loadingToast.innerText = 'Generating certificate...';
    document.body.appendChild(loadingToast);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = '/certifates.png';
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        
        // Student Name - Very visible
        ctx.font = 'bold 80px "Brush Script MT", cursive';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.fillText(user?.name || 'Student Name', centerX, 650);
        
        // Course Name - Very visible
        ctx.font = 'bold 48px "Georgia", serif';
        ctx.fillStyle = '#166534';
        ctx.fillText(course.title, centerX, 800);
        
        // Completion Date - Very visible
        ctx.font = '28px "Georgia", serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Completed on ${completionDate}`, centerX, 950);
        
        // Certificate ID - Very visible
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Certificate ID: ${certificateId}`, centerX, 1060);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${course.title.replace(/\s/g, '-')}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png', 1);
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      document.body.removeChild(loadingToast);
    }
  };

  const handleShare = (courseTitle: string) => {
    const text = `I completed "${courseTitle}" on Shara Climate Academy! 🌍`;
    if (navigator.share) navigator.share({ title: 'My Certificate', text });
    else navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const joinDate = new Date(user?.createdAt?.toDate?.() || new Date()).getFullYear();

  return (
    <div className="flex-1">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and view your achievements</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="certificates">Certificates ({completedCoursesData.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className={`rounded-xl border p-6 text-center ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <div className="relative inline-block">
                    <img src={profileImage} alt={user?.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-green-500" onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                    <label className="absolute bottom-2 right-0 bg-green-600 rounded-full p-1.5 cursor-pointer hover:bg-green-700 transition shadow-lg">
                      <Camera className="h-3.5 w-3.5 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                    {uploadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <h2 className={`text-xl font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name}</h2>
                  <p className={`text-xs capitalize mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.role} Learner</p>
                  <div className={`space-y-2 text-left text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>{user?.email}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Member since {joinDate}</span></div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Learning Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center"><p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.enrolledCourses?.length || 0}</p><p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enrolled</p></div>
                    <div className="text-center"><p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.completedCourses?.length || 0}</p><p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed</p></div>
                    <div className="text-center"><p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{completedCoursesData.length}</p><p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Certificates</p></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Learning Hours</span></div>
                      <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-green-600'}`}>{totalLearningHours} hrs</span>
                    </div>
                  </div>
                </div>

                {user?.bio && (
                  <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>About</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.bio}</p>
                  </div>
                )}

                <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Latest Achievements</h3>
                    <Link href="/certificates" className="text-xs text-green-600 hover:text-green-700">View all →</Link>
                  </div>
                  {completedCoursesData.length > 0 ? (
                    <div className="space-y-3">
                      {completedCoursesData.slice(0, 3).map((course) => (
                        <div key={course.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <Award className="h-5 w-5 text-yellow-600" />
                            <div><p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{course.title}</p><p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed {new Date().toLocaleDateString()}</p></div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadCertificate(course)}><Download className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No certificates yet. Complete courses to earn certificates!</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="certificates">
            <div>
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Certificates</h2>
              {completedCoursesData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completedCoursesData.map(course => (
                    <div key={course.id} className={`rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                      <div className="h-32 bg-gradient-to-r from-green-700 via-green-800 to-emerald-900 flex items-center justify-center"><Award className="h-10 w-10 text-white opacity-80" /></div>
                      <div className="p-4">
                        <h3 className={`font-semibold text-sm line-clamp-1 mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{course.title}</h3>
                        <p className={`text-xs mb-3 font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID: {`${course.id.slice(0, 8)}-${user?.uid?.slice(0, 8)}`}</p>
                        <div className="flex gap-2">
                          <Button onClick={() => handleDownloadCertificate(course)} className="flex-1 bg-green-700 hover:bg-green-800" size="sm"><Download className="mr-1 h-3 w-3" /> Download</Button>
                          <Button onClick={() => handleShare(course.title)} variant="outline" size="sm"><Share2 className="h-3 w-3" /></Button>
                        </div>
                        <Link href={`/certificates/${course.id}`} className="mt-2 block"><Button variant="outline" size="sm" className="w-full">View Certificate</Button></Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className={`text-base font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No certificates yet</h3>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Complete courses to earn certificates</p>
                  <Link href="/courses"><Button size="sm" className="bg-green-700">Browse Courses</Button></Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className={`rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Settings</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage your account information</p>
              </div>
              <div className="p-6">
                {successMessage && <Alert className="mb-6 bg-green-50 border-green-200"><AlertDescription className="text-green-800">{successMessage}</AlertDescription></Alert>}
                {!isEditing ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label><p className={`mt-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p></div>
                      <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label><p className={`mt-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.email}</p></div>
                      <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Role</label><p className={`mt-1 text-sm capitalize ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.role}</p></div>
                      <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location</label><p className={`mt-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{location || 'Not specified'}</p></div>
                    </div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bio</label><p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user?.bio || 'No bio added'}</p></div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Website</label><p className={`mt-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{website || 'Not specified'}</p></div>
                    {(linkedin || twitter || github) && (
                      <div className="pt-4">
                        <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Social Profiles</h4>
                        <div className="space-y-2">
                          {linkedin && <div className="flex items-center gap-2 text-sm"><Linkedin className="h-4 w-4 text-blue-600" /><span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{linkedin}</span></div>}
                          {twitter && <div className="flex items-center gap-2 text-sm"><Twitter className="h-4 w-4 text-blue-400" /><span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{twitter}</span></div>}
                          {github && <div className="flex items-center gap-2 text-sm"><Github className="h-4 w-4 text-gray-700" /><span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{github}</span></div>}
                        </div>
                      </div>
                    )}
                    <Button onClick={() => setIsEditing(true)} className="bg-green-700 hover:bg-green-800"><Edit2 className="mr-2 h-4 w-4" /> Edit Profile</Button>
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Preferences</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3"><Bell className="h-4 w-4 text-gray-500" /><span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email Notifications</span></div>
                          <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${notificationsEnabled ? 'bg-green-600' : 'bg-gray-300'}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${notificationsEnabled ? 'translate-x-5' : 'translate-x-1'}`} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3"><Moon className="h-4 w-4 text-gray-500" /><span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dark Mode</span></div>
                          <button onClick={toggleTheme} className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${isDarkMode ? 'bg-green-600' : 'bg-gray-300'}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${isDarkMode ? 'translate-x-5' : 'translate-x-1'}`} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                      <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location</label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                    </div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`mt-1 w-full px-3 py-2 text-sm border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Website</label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>LinkedIn</label><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="LinkedIn URL" className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Twitter</label><Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="Twitter URL" className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                    <div><label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>GitHub</label><Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL" className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} /></div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSaveProfile} className="bg-green-700 hover:bg-green-800"><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8">
                  <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                  <Button variant="destructive" disabled>Delete Account</Button>
                  <p className="text-xs text-gray-500 mt-2">Account deletion is currently disabled</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}