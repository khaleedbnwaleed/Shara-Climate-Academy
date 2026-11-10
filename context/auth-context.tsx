
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  type User,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export type AppUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  displayName?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  enrolledCourses: string[];
  completedCourses?: string[];
  approved?: boolean;
  status?: string;
  createdAt?: {
    toDate?: () => Date;
  } | null;
};

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  enrollCourse: (courseId: string) => Promise<void>;
  updateProfile: (name: string, bio: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

const handleAuthState = async (firebaseUser: User | null) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!isMounted) return;

        if (userSnap.exists()) {
          const userData = userSnap.data() as Partial<AppUser>;

          setUser({
            ...userData,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name ?? userData.displayName ?? '',
            role: userData.role ?? 'student',
            bio: userData.bio ?? '',
            enrolledCourses: userData.enrolledCourses ?? [],
            completedCourses: userData.completedCourses ?? [],
          });
        } else {
          const newUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName ?? '',
            role: 'student',
            bio: '',
            avatar: '/default-avatar.png',
            enrolledCourses: [],
            completedCourses: [],
            approved: true,
            status: 'active',
          };

          await setDoc(userRef, newUser);

          if (isMounted) {
            setUser(newUser);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('Firebase auth persistence set to LOCAL');
      } catch (error) {
        console.error(
          'Error setting auth persistence; continuing with current persistence:',
          error
        );
      }

      if (!isMounted) return;

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        void handleAuthState(firebaseUser);
      });
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();

      const needsApproval =
        userData.role === 'professional' ||
        userData.role === 'lecturer';

      if (needsApproval && userData.approved !== true) {
        await signOut(auth);
        throw new Error(
          'Your account is pending admin approval.'
        );
      }
    }

    console.log('Login successful');
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: string
  ) => {
    await setPersistence(auth, browserLocalPersistence);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const needsApproval =
      role === 'professional' || role === 'lecturer';

    const newUser: AppUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      name,
      role,
      bio: '',
      avatar: '/default-avatar.png',
      enrolledCourses: [],
      completedCourses: [],
      approved: !needsApproval,
      status: needsApproval ? 'pending' : 'active',
    };

    try {
      await setDoc(
        doc(db, 'users', userCredential.user.uid),
        newUser
      );

      setUser(newUser);
      console.log('Registration successful');
    } catch (error) {
      // Avoid leaving a signed-in account if its user record
      // could not be created.
      await signOut(auth);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const enrollCourse = async (courseId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (user.enrolledCourses.includes(courseId)) {
      return;
    }

    const updatedEnrolledCourses = [
      ...user.enrolledCourses,
      courseId,
    ];

    await updateDoc(doc(db, 'users', user.uid), {
      enrolledCourses: updatedEnrolledCourses,
    });

    setUser({
      ...user,
      enrolledCourses: updatedEnrolledCourses,
    });
  };

  const updateProfile = async (name: string, bio: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    await updateDoc(doc(db, 'users', user.uid), {
      name,
      bio,
    });

    setUser({
      ...user,
      name,
      bio,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loading: isLoading,
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

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}
