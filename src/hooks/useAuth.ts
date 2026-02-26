import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import { User } from '../types';
import { setTokenGetter } from '../utils/apiClient';

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') return 'https://herculito.exloz.site/';
  return `${window.location.origin}/`;
};

export function useAuth() {
  const { isLoaded: isAuthLoaded, getToken } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useUser();
  const { openSignIn, signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);

  const user = useMemo<User | null>(() => {
    if (!clerkUser) return null;

    const email = clerkUser.primaryEmailAddress?.emailAddress
      ?? clerkUser.emailAddresses[0]?.emailAddress
      ?? '';

    const name = clerkUser.fullName?.trim()
      || clerkUser.firstName?.trim()
      || clerkUser.username?.trim()
      || 'Usuario';

    return {
      id: clerkUser.externalId ?? clerkUser.id,
      email,
      name,
      photoURL: clerkUser.imageUrl || undefined
    };
  }, [clerkUser]);

  useEffect(() => {
    if (user) {
      setError(null);
    }
  }, [user]);

  useEffect(() => {
    const template = import.meta.env.VITE_CLERK_JWT_TEMPLATE || 'herculito_api';

    setTokenGetter(async () => {
      const templateToken = await getToken({ template });
      if (templateToken) return templateToken;
      return getToken();
    });

    return () => {
      setTokenGetter(null);
    };
  }, [getToken]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      openSignIn({
        afterSignInUrl: '/',
        afterSignUpUrl: '/'
      });
    } catch {
      setError('No se pudo iniciar sesion con Clerk. Intentalo de nuevo.');
    }
  }, [openSignIn]);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await signOut({ redirectUrl: '/' });
    } catch {
      setError('No se pudo cerrar la sesion. Intentalo de nuevo.');
    }
  }, [signOut]);

  return {
    user,
    loading: !isAuthLoaded || !isUserLoaded,
    error,
    signInWithGoogle,
    requiresSafariForGoogleSignIn: false,
    safariLoginUrl: getBrowserOrigin(),
    openSafariForGoogleLogin: signInWithGoogle,
    logout
  };
}
