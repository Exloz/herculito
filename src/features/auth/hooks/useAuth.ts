import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';
import { User } from '../../../shared/types';
import { setTokenGetter } from '../../../shared/api/apiClient';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { isAdminUser } from '../../../shared/lib/admin';

const AUTH_PROFILE_CACHE_KEY = 'auth-user-profile-cache';

interface CachedUserProfile {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

const readCachedUserProfile = (userId: string): CachedUserProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_CACHE_KEY);
    if (!raw) return null;

    const cachedProfiles = JSON.parse(raw) as Record<string, CachedUserProfile>;
    const cachedProfile = cachedProfiles[userId];
    if (!cachedProfile || cachedProfile.id !== userId) {
      return null;
    }

    return cachedProfile;
  } catch {
    return null;
  }
};

const writeCachedUserProfile = (profile: CachedUserProfile): void => {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_CACHE_KEY);
    const cachedProfiles = raw ? JSON.parse(raw) as Record<string, CachedUserProfile> : {};
    cachedProfiles[profile.id] = profile;
    window.localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(cachedProfiles));
  } catch {
    // ignore cache write failures
  }
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
  const { isLoaded: isAuthLoaded, isSignedIn, userId, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);
  const [cachedProfile, setCachedProfile] = useState<CachedUserProfile | null>(null);

  useEffect(() => {
    if (!userId) {
      setCachedProfile(null);
      return;
    }

    setCachedProfile(readCachedUserProfile(userId));
  }, [userId]);

  useEffect(() => {
    if (!clerkUser) {
      return;
    }

    const profile: CachedUserProfile = {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? '',
      name: resolveUserName(clerkUser),
      photoURL: resolveUserPhotoUrl(clerkUser)
    };

    setCachedProfile(profile);
    writeCachedUserProfile(profile);
  }, [clerkUser]);

  const user = useMemo<User | null>(() => {
    if (!isAuthLoaded) return null;
    if (!isSignedIn || !userId) return null;

    if (!clerkUser) {
      return {
        id: userId,
        clerkUserId: userId,
        email: cachedProfile?.email ?? '',
        name: cachedProfile?.name ?? 'Usuario',
        photoURL: cachedProfile?.photoURL
      };
    }

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
  }, [cachedProfile, clerkUser, isAuthLoaded, isSignedIn, userId]);

  const isAdmin = useMemo(() => {
    return isAdminUser({
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? cachedProfile?.email,
      clerkUserId: clerkUser?.id ?? userId
    });
  }, [cachedProfile?.email, clerkUser, userId]);

  const isAdminResolved = useMemo(() => {
    if (!isAuthLoaded || !isSignedIn || !userId) {
      return isAuthLoaded;
    }

    return Boolean(clerkUser) || Boolean(cachedProfile);
  }, [cachedProfile, clerkUser, isAuthLoaded, isSignedIn, userId]);

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
    isAdminResolved,
    loading: !isAuthLoaded || (isSignedIn === true && !user),
    error,
    logout
  };
}
