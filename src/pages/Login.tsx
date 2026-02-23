import { useEffect } from 'react';
import { useUI } from '../contexts/ui-context';

interface LoginProps {
  onGoogleLogin: () => void;
  loading: boolean;
  errorMessage?: string | null;
  requiresSafariForGoogleSignIn?: boolean;
  safariLoginUrl?: string;
  onOpenSafariForGoogleLogin?: () => void | Promise<void>;
}

export function Login({
  onGoogleLogin,
  loading,
  errorMessage,
  requiresSafariForGoogleSignIn = false,
  safariLoginUrl,
  onOpenSafariForGoogleLogin
}: LoginProps) {
  const { showToast } = useUI();

  const handleGoogleAction = () => {
    if (requiresSafariForGoogleSignIn && onOpenSafariForGoogleLogin) {
      void onOpenSafariForGoogleLogin();
      return;
    }

    onGoogleLogin();
  };

  const handleCopyError = async () => {
    if (!errorMessage) return;

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      showToast('No se pudo copiar el error automaticamente.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(errorMessage);
      showToast('Error copiado. Pegalo al reportarlo.', 'success');
    } catch {
      showToast('No se pudo copiar el error automaticamente.', 'error');
    }
  };

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, 'error');
    }
  }, [errorMessage, showToast]);

  return (
    <div className="app-shell flex items-center justify-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="app-card relative w-full max-w-md overflow-hidden p-8">
        <div className="absolute -top-20 -right-16 h-40 w-40 rounded-full bg-mint/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-amberGlow/20 blur-3xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-mint rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lift">
              <svg className="w-10 h-10 text-ink" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z" />
              </svg>
            </div>
            <h1 className="text-3xl font-display text-white mb-2">Herculito</h1>
            <p className="text-slate-300">Tu compañero de entrenamiento personal</p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-display text-white mb-2">Bienvenido</h2>
              <p className="text-slate-300 text-sm">
                Inicia sesión para empezar a registrar tus entrenamientos
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson">
                <p className="break-words">{errorMessage}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-crimson/80">Incluye este mensaje al reportar el problema.</p>
                  <button
                    type="button"
                    onClick={handleCopyError}
                    className="btn-ghost text-xs text-crimson hover:text-crimson"
                  >
                    Copiar error
                  </button>
                </div>
              </div>
            )}

            {requiresSafariForGoogleSignIn && (
              <div className="rounded-xl border border-amberGlow/40 bg-amberGlow/10 px-4 py-3 text-sm text-amberGlow">
                En iPhone con la app instalada, Google debe abrirse en Safari para mostrar teclado y completar el login.
              </div>
            )}

            <button
              onClick={handleGoogleAction}
              disabled={loading || (requiresSafariForGoogleSignIn && !onOpenSafariForGoogleLogin)}
              className="btn-primary w-full flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : requiresSafariForGoogleSignIn ? (
                <span>Copiar enlace para Safari</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>

            <p className="text-xs text-slate-400 text-center">
              {requiresSafariForGoogleSignIn
                ? 'El boton copia o comparte el enlace para abrirlo en Safari y evitar el bloqueo de iOS PWA.'
                : 'Sincroniza tu progreso y accede desde cualquier dispositivo.'}
            </p>

            {requiresSafariForGoogleSignIn && safariLoginUrl && (
              <p className="text-[11px] text-slate-500 break-all text-center">URL Safari: {safariLoginUrl}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
