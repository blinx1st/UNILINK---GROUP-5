import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { seedDatabase } from './seedData';

export type UserRole = 'student' | 'admin_officer' | 'student_support_officer' | 'manager' | 'director' | 'it_support';

export interface UserProfile {
  uid: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id?: string;
  student_number?: string;
  program?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInAsDemo: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isDemo) return; // Don't override demo state

      setUser(user);
      if (user) {
        const docRef = doc(db, 'profiles', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          let currentProfile: UserProfile;
          
          if (docSnap.exists()) {
            currentProfile = docSnap.data() as UserProfile;
          } else {
            // If profile doesn't exist, create a default student profile
            // Check if it's the default admin email
            const role: UserRole = user.email === 'blinx1st@gmail.com' ? 'it_support' : 'student';
            currentProfile = {
              uid: user.uid,
              email: user.email || '',
              full_name: user.displayName || 'New User',
              role: role,
            };
            await setDoc(docRef, currentProfile);
          }
          
          setProfile(currentProfile);

          // Seed database if admin/it_support logs in
          if (currentProfile.role === 'it_support' || currentProfile.role === 'manager') {
            seedDatabase().catch(err => console.error('Seeding failed:', err));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemo]);

  const signInAsDemo = async (role: UserRole) => {
    setLoading(true);
    setIsDemo(true);
    
    // Mock user object
    const mockUser = {
      uid: `demo-${role}`,
      email: `${role}@demo.unilink.edu`,
      displayName: `Demo ${role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
    } as User;

    const mockProfile: UserProfile = {
      uid: mockUser.uid,
      email: mockUser.email!,
      full_name: mockUser.displayName!,
      role: role,
    };

    setUser(mockUser);
    setProfile(mockProfile);
    setLoading(false);

    // Seed database for demo user
    if (role === 'it_support' || role === 'manager' || role === 'student') {
      seedDatabase(mockUser.uid).catch(err => console.error('Demo seeding failed:', err));
    }
  };

  const logout = async () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setProfile(null);
    } else {
      await auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
