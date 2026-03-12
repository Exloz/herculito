import { useCallback, useState } from 'react';
import { useSignIn } from '@clerk/react/legacy';
import { toUserMessage } from '../../../shared/lib/errorMessages';

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
      setError(toUserMessage(signInError, 'No se pudo iniciar sesión con Clerk. Inténtalo de nuevo.'));
    }
  }, [isLoaded, signIn]);

  return {
    loading: !isLoaded,
    error,
    signInWithGoogle
  };
};
