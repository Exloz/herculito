import { lazy, Suspense, useRef } from 'react';
import { LogOut, Ruler, Shield, X } from 'lucide-react';
import type { AppPage } from '../hooks/usePageNavigation';
import { ThemePicker } from '../theme/ThemePicker';
import { DialogPortal } from '../../shared/ui/DialogPortal';
import { useDialogA11y } from '../../shared/hooks/useDialogA11y';
import { version } from '../../../package.json';

const AccountButton = lazy(() => import('../../features/auth/components/ClerkUserButton'));

interface MobileAccountMenuProps {
  userName: string;
  isAdmin: boolean;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  onClose: () => void;
}

export function MobileAccountMenu({ userName, isAdmin, onNavigate, onLogout, onClose }: MobileAccountMenuProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, { onClose });
  const navigate = (page: AppPage) => { onClose(); onNavigate(page); };

  return <DialogPortal>
    <div className="account-backdrop" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="account-menu-title"
        className="account-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="account-menu-title" className="min-w-0 break-words text-lg font-semibold">Tu cuenta</h2>
          <button type="button" className="workspace-icon-button" onClick={onClose} aria-label="Cerrar opciones de cuenta"><X size={20} /></button>
        </div>
        <div className="account-sheet-identity">
          <div className="workspace-account-control">
            <Suspense fallback={<span className="user-avatar">{userName[0]}</span>}>
              <AccountButton onNavigateToProfile={() => navigate('profile')} />
            </Suspense>
          </div>
          <div className="min-w-0"><p className="break-words font-medium">{userName}</p>
            <p className="mt-1 text-xs text-muted">Toca tu avatar para gestionar tu cuenta</p></div>
        </div>
        <button type="button" className="account-sheet-row" onClick={() => navigate('profile')}><Ruler size={19} />Mis medidas</button>
        {isAdmin && <button type="button" className="account-sheet-row" onClick={() => navigate('admin')}><Shield size={19} />Administración</button>}
        <div className="account-sheet-row justify-between"><span>Apariencia</span><ThemePicker showLabel /></div>
        <button type="button" className="account-sheet-row text-muted" onClick={() => { onClose(); onLogout(); }}><LogOut size={19} />Cerrar sesión</button>
        <p className="pt-3 text-center text-xs text-muted">Herculito · v{version}</p>
      </div>
    </div>
  </DialogPortal>;
}
