import { useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { User } from '../types';

const REDIRECT_MARKER_KEY = 'herculito.auth.redirect-pending';
const REDIRECT_MARKER_MAX_AGE_MS = 10 * 60 * 1000;

type AuthPersistenceMode = 'local' | 'session' | 'memory' | 'default';
type RedirectContext = 'ios-pwa' | 'popup-fallback';

interface RedirectMarker {
  ts: number;
  context: RedirectContext;
}

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

const getFirebaseErrorMessage = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) return null;

  const maybeMessage = (error as { message?: unknown }).message;
  return typeof maybeMessage === 'string' ? maybeMessage : null;
};

const isMissingInitialStateError = (error: unknown) => {
  const code = getFirebaseErrorCode(error);
  if (code === 'auth/missing-initial-state' || code === 'auth/missing-redirect-initial-state') {
    return true;
  }

  const message = getFirebaseErrorMessage(error)?.toLowerCase() ?? '';
  return (
    message.includes('missing initial state') ||
    message.includes('sessionstorage is inaccessible') ||
    message.includes('storage-partitioned')
  );
};

const withErrorCode = (message: string, code: string | null) => {
  if (!code) return message;
  return `${message} (codigo: ${code})`;
};

const getNormalizedHost = (domain: string): string | null => {
  const trimmed = domain.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).hostname;
  } catch {
    return null;
  }
};

const getAuthDomainMismatchHint = () => {
  if (typeof window === 'undefined') return null;

  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (!authDomain) return null;

  const authHost = getNormalizedHost(authDomain);
  if (!authHost) return null;

  if (window.location.hostname === authHost) return null;

  return `app=${window.location.hostname}, authDomain=${authHost}`;
};

const setRedirectMarker = (context: RedirectContext) => {
  if (typeof window === 'undefined') return;

  const payload: RedirectMarker = {
    ts: Date.now(),
    context
  };

  try {
    window.localStorage.setItem(REDIRECT_MARKER_KEY, JSON.stringify(payload));
  } catch {
    // Si localStorage no esta disponible, continuamos sin marker.
  }
};

const clearRedirectMarker = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(REDIRECT_MARKER_KEY);
  } catch {
    // Ignorar errores de almacenamiento.
  }
};

const getRedirectMarker = (): RedirectMarker | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(REDIRECT_MARKER_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<RedirectMarker>;
    if (!parsed || typeof parsed.ts !== 'number') {
      clearRedirectMarker();
      return null;
    }

    if (parsed.context !== 'ios-pwa' && parsed.context !== 'popup-fallback') {
      clearRedirectMarker();
      return null;
    }

    const isExpired = Date.now() - parsed.ts > REDIRECT_MARKER_MAX_AGE_MS;
    if (isExpired) {
      clearRedirectMarker();
      return null;
    }

    return {
      ts: parsed.ts,
      context: parsed.context
    };
  } catch {
    clearRedirectMarker();
    return null;
  }
};

const configurePersistence = async (): Promise<AuthPersistenceMode> => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    return 'local';
  } catch {
    // Fallback below.
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    return 'session';
  } catch {
    // Fallback below.
  }

  try {
    await setPersistence(auth, inMemoryPersistence);
    return 'memory';
  } catch {
    return 'default';
  }
};

const getFriendlyErrorMessage = (error: unknown, fallbackMessage: string) => {
  const code = getFirebaseErrorCode(error);

  if (isMissingInitialStateError(error)) {
    const mismatchHint = getAuthDomainMismatchHint();
    const baseMessage = mismatchHint
      ? `Firebase no pudo completar la redireccion por estado inicial faltante. Posible causa: entorno con almacenamiento particionado y dominios distintos (${mismatchHint}).`
      : 'Firebase no pudo completar la redireccion por estado inicial faltante. Esto suele ocurrir en iOS PWA cuando sessionStorage no esta disponible.';
    return withErrorCode(baseMessage, code ?? 'auth/missing-initial-state');
  }

  if (code === 'auth/popup-closed-by-user') {
    return withErrorCode('Cancelaste el inicio de sesion con Google.', code);
  }

  if (code === 'auth/network-request-failed') {
    return withErrorCode('No hay conexion de red para completar el inicio de sesion.', code);
  }

  if (code === 'auth/too-many-requests') {
    return withErrorCode('Se bloquearon temporalmente los intentos. Espera un momento e intenta de nuevo.', code);
  }

  if (code === 'auth/unauthorized-domain') {
    const mismatchHint = getAuthDomainMismatchHint();
    const baseMessage = mismatchHint
      ? `El dominio actual no esta autorizado en Firebase (${mismatchHint}).`
      : 'El dominio actual no esta autorizado en Firebase.';
    return withErrorCode(baseMessage, code);
  }

  const firebaseMessage = getFirebaseErrorMessage(error);
  const resolvedMessage = firebaseMessage ? `${fallbackMessage} ${firebaseMessage}` : fallbackMessage;
  return withErrorCode(resolvedMessage, code);
};

const getRedirectRecoveryError = (marker: RedirectMarker, persistenceMode: AuthPersistenceMode) => {
  const mismatchHint = getAuthDomainMismatchHint();

  if (persistenceMode === 'memory') {
    return withErrorCode(
      'Completaste el flujo de Google, pero el dispositivo no permite guardar sesion persistente en este contexto. Abre la app en Safari e intenta nuevamente.',
      'auth/redirect-session-not-restored'
    );
  }

  if (marker.context === 'ios-pwa') {
    const base = 'Completaste el flujo de Firebase, pero iOS no devolvio la sesion a la PWA instalada.';
    if (mismatchHint) {
      return withErrorCode(
        `${base} Posible causa: dominio distinto entre la app y Firebase Auth (${mismatchHint}).`,
        'auth/redirect-session-not-restored'
      );
    }

    return withErrorCode(
      `${base} Intenta abrir Herculito desde Safari y vuelve a iniciar sesion.`,
      'auth/redirect-session-not-restored'
    );
  }

  return withErrorCode(
    'Completaste el flujo de Firebase, pero no se pudo recuperar la sesion al volver a la app. Intentalo de nuevo.',
    'auth/redirect-session-not-restored'
  );
};

const mapFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email || '',
  name: firebaseUser.displayName || 'Usuario',
  photoURL: firebaseUser.photoURL || undefined,
});

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persistenceMode, setPersistenceMode] = useState<AuthPersistenceMode>('default');

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;
    const redirectMarker = getRedirectMarker();
    let resolvedPersistenceMode: AuthPersistenceMode = 'default';
    let redirectResolvedUser = false;
    let redirectFailed = false;

    const initializeAuth = async () => {
      resolvedPersistenceMode = await configurePersistence();

      if (!isActive) return;
      setPersistenceMode(resolvedPersistenceMode);

      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          redirectResolvedUser = true;
          clearRedirectMarker();
        }
      } catch (redirectError) {
        redirectFailed = true;
        clearRedirectMarker();
        if (isActive) {
          setError(getFriendlyErrorMessage(redirectError, 'No se pudo completar el inicio de sesion con Google.'));
        }
      }

      if (!isActive) return;

      unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          setUser(mapFirebaseUser(firebaseUser));
          setError(null);
          clearRedirectMarker();
        } else {
          setUser(null);

          if (redirectMarker && !redirectResolvedUser && !redirectFailed) {
            setError(getRedirectRecoveryError(redirectMarker, resolvedPersistenceMode));
            clearRedirectMarker();
          }
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
    const runRedirectSignIn = async (context: RedirectContext) => {
      if (persistenceMode === 'memory') {
        setError(withErrorCode(
          'Este dispositivo no permite persistencia para recuperar sesion tras redireccion. Abre la app en Safari e intenta nuevamente.',
          'auth/persistence-unavailable'
        ));
        setLoading(false);
        return;
      }

      const mismatchHint = getAuthDomainMismatchHint();
      if (context === 'ios-pwa' && mismatchHint) {
        setError(withErrorCode(
          `No se inicia redireccion en iOS PWA porque Firebase Auth usa otro dominio (${mismatchHint}). Esta configuracion dispara el error de estado inicial faltante. Usa la web en Safari o alinea authDomain con el dominio de la app.`,
          'auth/redirect-domain-mismatch'
        ));
        setLoading(false);
        return;
      }

      setRedirectMarker(context);

      try {
        await signInWithRedirect(auth, googleProvider);
        setLoading(false);
      } catch (redirectError) {
        clearRedirectMarker();
        setError(getFriendlyErrorMessage(redirectError, 'No se pudo iniciar sesion con redireccion de Google.'));
        setLoading(false);
      }
    };

    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (popupError) {
      const isStandaloneIos = isIosStandalone();
      const errorCode = getFirebaseErrorCode(popupError);
      const canFallbackToRedirect = (
        errorCode === 'auth/popup-blocked' ||
        errorCode === 'auth/operation-not-supported-in-this-environment'
      );

      if (canFallbackToRedirect) {
        const context: RedirectContext = isStandaloneIos ? 'ios-pwa' : 'popup-fallback';
        await runRedirectSignIn(context);
        return;
      }

      if (errorCode === 'auth/popup-closed-by-user') {
        setError(withErrorCode('Cancelaste el inicio de sesion con Google. Intentalo de nuevo.', errorCode));
      } else if (isStandaloneIos) {
        setError(getFriendlyErrorMessage(
          popupError,
          'No se pudo iniciar sesion con Google en iOS PWA. Intenta abrir Herculito desde Safari y vuelve a intentarlo.'
        ));
      } else {
        setError(getFriendlyErrorMessage(popupError, 'No se pudo iniciar sesion con Google. Intentalo de nuevo.'));
      }

      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (logoutError) {
      setError(getFriendlyErrorMessage(logoutError, 'No se pudo cerrar la sesion. Intentalo de nuevo.'));
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
