import { useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { User } from '../types';

const isIosStandalone = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standaloneFromMedia = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const nav = navigator as Navigator & { standalone?: unknown };
  const standalone = standaloneFromMedia || nav.standalone === true;

  return isIos && standalone;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void setPersistence(auth, browserLocalPersistence);

    getRedirectResult(auth).catch(() => {
      setError('No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.');
    });

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

      if (isIosStandalone()) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

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
