import { useState } from 'react';
import { ArrowRight, FlaskConical, RotateCcw } from 'lucide-react';
import { PreviewApp } from '../App';
import { PREVIEW_USER } from './previewFixtures';

export function PreviewRoot() {
  const [signedIn, setSignedIn] = useState(true);
  const empty = new URLSearchParams(window.location.search).get('scenario') === 'empty';

  return (
    <>
      <div className="preview-toolbar border-b border-amberGlow/20 bg-amberGlow/10 px-4 py-2 text-amberGlow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2" title="Los cambios se reinician al recargar. No se usa la API real.">
            <FlaskConical size={16} />Preview local · datos de ejemplo
          </span>
          <div className="flex items-center gap-3">
            <a className="min-h-9 content-center underline underline-offset-4" href={empty ? '/' : '/?scenario=empty'}>
              {empty ? 'Ver con datos' : 'Ver estado vacío'}
            </a>
            <button type="button" onClick={() => window.location.reload()} className="flex min-h-9 items-center gap-1.5">
              <RotateCcw size={14} />Reiniciar
            </button>
          </div>
        </div>
      </div>
      {signedIn ? (
        <PreviewApp auth={{ user: PREVIEW_USER, isAdmin: false, isAdminResolved: true,
          loading: false, error: null, logout: async () => setSignedIn(false) }} />
      ) : (
        <main className="mx-auto max-w-md px-4 py-16">
          <div className="app-card p-6">
            <span className="chip">Entorno de desarrollo</span>
            <h1 className="mt-4 font-display text-3xl text-white">Tu espacio para probar</h1>
            <p className="mt-3 text-slate-300">Explora Herculito como Alex, sin cuenta, credenciales ni conexión con la API real.</p>
            <button type="button" onClick={() => setSignedIn(true)} className="btn-primary mt-6 flex w-full items-center justify-center gap-2">
              Entrar a la preview <ArrowRight size={18} />
            </button>
          </div>
        </main>
      )}
    </>
  );
}
