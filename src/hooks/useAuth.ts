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

const getFirebaseErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) return null;

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        // Keep default persistence if local persistence is not available.
      }

      try {
        await getRedirectResult(auth);
      } catch {
        if (isActive) {
          setError('No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.');
        }
      }

      if (!isActive) return;

      unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
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
    };

    void initializeAuth();

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (popupError) {
      const isStandaloneIos = isIosStandalone();
      const errorCode = getFirebaseErrorCode(popupError);
      const canFallbackToRedirect = !isStandaloneIos && (
        errorCode === 'auth/popup-blocked' ||
        errorCode === 'auth/operation-not-supported-in-this-environment'
      );

      if (canFallbackToRedirect) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          // Continue to generic error handling below.
        }
      }

      if (errorCode === 'auth/popup-closed-by-user') {
        setError('Cancelaste el inicio de sesión con Google. Inténtalo de nuevo.');
      } else if (isStandaloneIos) {
        setError('No se pudo iniciar sesión en iOS PWA con Google. Inténtalo de nuevo desde la app instalada.');
      } else {
        setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
      }

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
