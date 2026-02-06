import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Usuario',
          photoURL: firebaseUser.photoURL || undefined,
        };
        setUser(user);
        setError(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch {
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.');
      // Error silencioso para logout
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
  };
}
