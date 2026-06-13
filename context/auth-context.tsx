'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type AppUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  enrolledCourses: string[];
  completedCourses?: string[];
  approved?: boolean;
  status?: string;
};

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  enrollCourse: (courseId: string) => Promise<void>;
  updateProfile: (name: string, bio: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email || 'No user');
      
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as AppUser;
            console.log('User loaded:', userData.email, 'Role:', userData.role);
            setUser(userData);
          } else {
            console.log('Creating new user document');
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: '',
              role: 'student',
              bio: '',
              avatar: '/default-avatar.png',
              enrolledCourses: [],
              completedCourses: [],
              approved: true,
              status: 'active',
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error loading user:', error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Logging in:', email);
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const needsApproval = userData.role === 'professional' || userData.role === 'lecturer';
      if (needsApproval && userData.approved !== true) {
        await signOut(auth);
        throw new Error('Your account is pending admin approval.');
      }
    }
    console.log('Login successful');
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    console.log('Registering:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const needsApproval = role === 'professional' || role === 'lecturer';
    
    const newUser: AppUser = {
      uid: userCredential.user.uid,
      email: email,
      name: name,
      role: role,
      bio: '',
      avatar: '/default-avatar.png',
      enrolledCourses: [],
      completedCourses: [],
      approved: !needsApproval,
      status: needsApproval ? 'pending' : 'active',
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    setUser(newUser);
    console.log('Registration successful');
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const enrollCourse = async (courseId: string) => {
    if (!user) throw new Error('User not authenticated');
    if (user.enrolledCourses?.includes(courseId)) return;
    
    const updatedEnrolledCourses = [...(user.enrolledCourses || []), courseId];
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { enrolledCourses: updatedEnrolledCourses });
    setUser({ ...user, enrolledCourses: updatedEnrolledCourses });
  };

  const updateProfile = async (name: string, bio: string) => {
    if (!user) throw new Error('User not authenticated');
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { name, bio });
    setUser({ ...user, name, bio });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
        enrollCourse,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
