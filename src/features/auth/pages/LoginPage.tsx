import { Suspense, lazy, useState } from 'react';
import { useUI } from '../../../app/providers/ui-context';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

const ClerkAuthOptions = lazy(() => import('../components/ClerkAuthOptions'));

interface LoginProps {
  errorMessage?: string | null;
}

export function Login({ errorMessage }: LoginProps) {
  const { showToast } = useUI();
  const [showClerkOptions, setShowClerkOptions] = useState(false);
  const {
    loading,
    error: googleSignInError,
    signInWithGoogle
  } = useGoogleSignIn();
  const effectiveErrorMessage = errorMessage || googleSignInError;

  const handleGoogleAction = () => {
    void signInWithGoogle();
  };

  const handleCopyError = async () => {
    if (!effectiveErrorMessage) return;

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      showToast('No se pudo copiar el error automáticamente.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(effectiveErrorMessage);
      showToast('Error copiado. Pégalo al reportarlo.', 'success');
    } catch {
      showToast('No se pudo copiar el error automáticamente.', 'error');
    }
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <main className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-mint/20 bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.14),transparent_28%),linear-gradient(180deg,rgba(17,24,39,0.99),rgba(11,15,20,0.99))] shadow-lift">
        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <section className="border-b border-white/8 p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-mint/85">
              Gym tracker mobile-first
            </div>

            <div className="mt-6 max-w-xl">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-mint text-ink shadow-lift">
                <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z" />
                </svg>
              </div>

              <h1 className="font-display text-[3rem] uppercase leading-[0.9] text-white sm:text-[4rem]">
                Entra. Entrena. Repite.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300">
                Herculito guarda tus rutinas, tu progreso y tu ritmo semanal para que vuelvas al entrenamiento con menos fricción y más constancia.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Rutinas</div>
                <div className="mt-1 font-display text-2xl text-white">Listas</div>
                <div className="mt-1 text-xs text-slate-300">Empieza con un toque.</div>
              </div>
              <div className="rounded-[1.4rem] border border-mint/20 bg-mint/10 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-mint/80">Progreso</div>
                <div className="mt-1 font-display text-2xl text-white">Visible</div>
                <div className="mt-1 text-xs text-slate-300">Carga, récords e historial.</div>
              </div>
              <div className="rounded-[1.4rem] border border-amberGlow/20 bg-amberGlow/10 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-amberGlow/80">Calendario</div>
                <div className="mt-1 font-display text-2xl text-white">Constancia</div>
                <div className="mt-1 text-xs text-slate-300">Sigue tu ritmo semanal.</div>
              </div>
            </div>
          </section>

          <section className="p-6 lg:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Acceso</div>
            <h2 className="mt-2 font-display text-[2rem] uppercase leading-[0.94] text-white sm:text-[2.5rem]">Vuelve a tu dashboard</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Inicia sesión para abrir tus rutinas, continuar entrenamientos activos y revisar tu progreso desde cualquier dispositivo.
            </p>

            <div className="mt-6 space-y-5">
              {effectiveErrorMessage && (
                <div className="rounded-[1.4rem] border border-crimson/40 bg-crimson/10 px-4 py-4 text-sm text-crimson">
                  <p className="break-words">{effectiveErrorMessage}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-crimson/80">Incluye este mensaje al reportar el problema.</p>
                    <button
                      type="button"
                      onClick={handleCopyError}
                      className="btn-ghost border border-crimson/20 bg-crimson/10 text-xs text-crimson hover:text-crimson"
                    >
                      Copiar error
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Acceso principal</div>
                <button
                  onClick={handleGoogleAction}
                  disabled={loading}
                  className="btn-primary flex w-full items-center justify-center gap-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-ink border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Continuar con Google</span>
                    </>
                  )}
                </button>

                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Sincroniza tu progreso, tus rutinas y el estado de tus entrenamientos entre dispositivos.
                </p>
              </div>

              {showClerkOptions ? (
                <Suspense
                  fallback={
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-hidden="true">
                      <div className="skeleton-block h-11 rounded-xl" />
                      <div className="skeleton-block h-11 rounded-xl" />
                    </div>
                  }
                >
                  <ClerkAuthOptions />
                </Suspense>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClerkOptions(true)}
                  className="btn-secondary w-full text-sm"
                >
                  Ver más opciones de acceso
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
