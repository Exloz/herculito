import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { User } from '../../../shared/types';
import { setTokenGetter } from '../../../shared/api/apiClient';
import { syncUserProfile } from '../../../shared/api/dataApi';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { isAdminUser } from '../../../shared/lib/admin';

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') return 'https://herculito.exloz.site/';
  return `${window.location.origin}/`;
};

const resolveUserName = (clerkUser: NonNullable<ReturnType<typeof useUser>['user']>): string => {
  const fullName = clerkUser.fullName?.trim();
  if (fullName) return fullName;

  const firstName = clerkUser.firstName?.trim() ?? '';
  const lastName = clerkUser.lastName?.trim() ?? '';
  const joined = `${firstName} ${lastName}`.trim();
  if (joined) return joined;

  if (firstName) return firstName;
  if (lastName) return lastName;

  return 'Usuario';
};

const resolveUserPhotoUrl = (clerkUser: NonNullable<ReturnType<typeof useUser>['user']>): string | undefined => {
  const primaryImage = clerkUser.imageUrl?.trim();
  if (primaryImage) return primaryImage;

  const firstAccountImage = clerkUser.externalAccounts?.find((account) => typeof account.imageUrl === 'string' && account.imageUrl.trim().length > 0)?.imageUrl;
  return firstAccountImage?.trim() || undefined;
};

export function useAuth() {
  const { isLoaded: isAuthLoaded, getToken } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useUser();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);

  const user = useMemo<User | null>(() => {
    if (!clerkUser) return null;

    const email = clerkUser.primaryEmailAddress?.emailAddress
      ?? clerkUser.emailAddresses[0]?.emailAddress
      ?? '';

    const name = resolveUserName(clerkUser);

    return {
      id: clerkUser.externalId ?? clerkUser.id,
      clerkUserId: clerkUser.id,
      email,
      name,
      photoURL: resolveUserPhotoUrl(clerkUser)
    };
  }, [clerkUser]);

  const isAdmin = useMemo(() => {
    return isAdminUser({
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress,
      clerkUserId: clerkUser?.id
    });
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

  useEffect(() => {
    if (!user) return;

    void syncUserProfile({
      displayName: user.name,
      avatarUrl: user.photoURL,
      email: user.email
    }).catch(() => {
      // ignore profile sync failures; auth remains functional
    });
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      if (!isSignInLoaded || !signIn) {
        throw new Error('clerk_signin_not_ready');
      }

      const origin = typeof window === 'undefined' ? 'https://herculito.exloz.site' : window.location.origin;
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}/`
      });
    } catch (error) {
      setError(toUserMessage(error, 'No se pudo iniciar sesion con Clerk. Intentalo de nuevo.'));
    }
  }, [isSignInLoaded, signIn]);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      setError(toUserMessage(error, 'No se pudo cerrar la sesion. Intentalo de nuevo.'));
    }
  }, [signOut]);

  return {
    user,
    isAdmin,
    loading: !isAuthLoaded || !isUserLoaded,
    error,
    signInWithGoogle,
    requiresSafariForGoogleSignIn: false,
    safariLoginUrl: getBrowserOrigin(),
    openSafariForGoogleLogin: signInWithGoogle,
    logout
  };
}
