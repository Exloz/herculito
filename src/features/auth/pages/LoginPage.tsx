import { Suspense, lazy, useState } from 'react';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { ThemePicker } from '../../../app/theme/ThemePicker';
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
    <div className="login-page">
      <header className="login-header">
        <span className="sidebar-logo"><span className="brand-mark"><Dumbbell size={21} /></span><span>herculito<span className="brand-dot">.</span></span></span>
        <ThemePicker />
      </header>
      <main className="login-layout">
        <section className="login-intro">
          <span className="eyebrow">Tu espacio de entrenamiento</span>
          <h1>Un poco más fuerte.<br /><span className="text-mint">Una sesión a la vez.</span></h1>
          <p>Planifica tus rutinas, registra cada serie y dale continuidad a tu progreso. Todo en un mismo lugar.</p>
          <div className="login-example" aria-hidden="true">
            <div className="flex items-center justify-between text-xs text-slate-400"><span>Tu próxima sesión</span><Dumbbell size={16} /></div>
            <div className="mt-5 text-xl font-semibold text-white">Hoy toca avanzar.</div>
            <div className="mt-2 text-xs text-slate-400">Tu rutina. Tus pesos. Tu ritmo.</div>
            <div className="login-example-series"><span>01 <i /></span><span>02 <i /></span><span>03 <i /></span></div>
            <span className="mt-5 inline-flex items-center gap-2 text-xs text-mint">Todo listo para tu siguiente serie <ArrowRight size={14} /></span>
          </div>
        </section>
        <section className="login-access">
          <span className="eyebrow">Bienvenido a Herculito</span>
          <h2>Vuelve a tu ritmo.</h2>
          <p>Inicia sesión para continuar donde lo dejaste.</p>
          {effectiveErrorMessage && <div className="my-5 rounded-lg border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson" role="alert">
            <p className="break-words">{effectiveErrorMessage}</p>
            <button type="button" onClick={handleCopyError} className="btn-ghost mt-2 text-xs text-crimson">Copiar error</button>
          </div>}
          <button type="button" onClick={handleGoogleAction} disabled={loading}
            className="btn-primary mt-8 flex w-full items-center justify-center gap-3">
            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Conectando…</>
              : <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22ZM6.41 13.92a6 6 0 0 1 0-3.84v-2.6H3.06a10 10 0 0 0 0 9.04l3.35-2.6ZM12 5.96c1.47 0 2.8.5 3.84 1.5l2.88-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.35 2.6A6 6 0 0 1 12 5.96Z" /></svg>Continuar con Google</>}
          </button>
          <div className="login-divider"><span />o<span /></div>
          {showClerkOptions ? <Suspense fallback={<div role="status" className="text-sm text-slate-400">Cargando opciones…</div>}><ClerkAuthOptions /></Suspense>
            : <button type="button" onClick={() => setShowClerkOptions(true)} className="btn-secondary w-full">Más opciones de acceso</button>}
          <p className="login-footnote">Tus rutinas y tu progreso, sincronizados entre dispositivos.</p>
        </section>
      </main>
      <footer className="login-footer">Cada serie cuenta.</footer>
    </div>
  );
}
