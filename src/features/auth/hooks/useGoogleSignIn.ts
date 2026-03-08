import { useCallback, useState } from 'react';
import { useSignIn } from '@clerk/react/legacy';
import { toUserMessage } from '../../../shared/lib/errorMessages';

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') return 'https://herculito.exloz.site/';
  return `${window.location.origin}/`;
};

export const useGoogleSignIn = () => {
  const { isLoaded, signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);

      if (!isLoaded || !signIn) {
        throw new Error('clerk_signin_not_ready');
      }

      const origin = typeof window === 'undefined' ? 'https://herculito.exloz.site' : window.location.origin;
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}/`
      });
    } catch (signInError) {
      setError(toUserMessage(signInError, 'No se pudo iniciar sesion con Clerk. Intentalo de nuevo.'));
    }
  }, [isLoaded, signIn]);

  return {
    loading: !isLoaded,
    error,
    signInWithGoogle,
    requiresSafariForGoogleSignIn: false,
    safariLoginUrl: getBrowserOrigin(),
    openSafariForGoogleLogin: signInWithGoogle
  };
};
