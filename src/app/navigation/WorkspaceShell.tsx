import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Dumbbell, MoreHorizontal, Search } from 'lucide-react';
import type { User } from '../../shared/types';
import type { AppPage } from '../hooks/usePageNavigation';
import { ThemePicker } from '../theme/ThemePicker';
import { Navigation } from './Navigation';
import { CommandMenu } from './CommandMenu';
import { DESTINATIONS } from './destinations';
import { ActivitySyncStatus } from '../../features/activity-sync/ActivitySyncStatus';
import { MobileAccountMenu } from './MobileAccountMenu';

const AccountButton = lazy(() => import('../../features/auth/components/ClerkUserButton'));

interface WorkspaceShellProps {
  children: ReactNode;
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
  user: User;
  isAdmin: boolean;
  onLogout: () => void;
}

export function WorkspaceShell({ children, currentPage, onPageChange, user, isAdmin, onLogout }: WorkspaceShellProps) {
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const destination = DESTINATIONS.find((item) => item.page === currentPage)!;

  useEffect(() => {
    document.title = `${destination.label} · Herculito`;
    contentRef.current?.focus({ preventScroll: true });
  }, [destination.label]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        // Leave a nested editor's shortcut and focus trap to the editor.
        if (!commandsOpen && document.body.classList.contains('dialog-open')) return;
        event.preventDefault();
        setCommandsOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandsOpen]);

  return (
    <div className="workspace">
      <a href="#workspace-content" className="skip-link">Saltar al contenido</a>
      <Navigation currentPage={currentPage} onPageChange={onPageChange} isAdmin={isAdmin} userId={user.id}
        userName={user.name} onLogout={onLogout} onOpenCommands={() => setCommandsOpen(true)} />
      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-location"><div className="workspace-breadcrumb"><Dumbbell size={17} className="text-mint" aria-hidden="true" />
            <span className="workspace-breadcrumb-brand">{destination.group}</span><ChevronRight size={13} aria-hidden="true" />
            <span>{destination.label}</span>
          </div><ActivitySyncStatus userId={user.id} /></div>
          <div className="flex items-center gap-2">
            <button type="button" className="workspace-search" onClick={() => setCommandsOpen(true)} aria-label="Buscar y navegar">
              <Search size={16} /><span>Buscar o ir a…</span><kbd>⌘ / Ctrl K</kbd>
            </button>
            <div className="workspace-desktop-control"><ThemePicker /></div>
            <div className="workspace-account-control workspace-desktop-control">
              <Suspense fallback={<span className="user-avatar" aria-hidden="true">{user.name[0]}</span>}>
                <AccountButton onNavigateToProfile={() => onPageChange('profile')} />
              </Suspense>
            </div>
            <button type="button" className="workspace-icon-button mobile-account-action" onClick={() => setAccountOpen(true)}
              aria-label="Abrir opciones de cuenta" aria-haspopup="dialog" aria-expanded={accountOpen}><MoreHorizontal size={22} /></button>
          </div>
        </header>
        <div id="workspace-content" ref={contentRef} tabIndex={-1} className="workspace-content">{children}</div>
      </div>
      {commandsOpen && <CommandMenu isAdmin={isAdmin} onNavigate={onPageChange} onClose={() => setCommandsOpen(false)} />}
      {accountOpen && <MobileAccountMenu userName={user.name} isAdmin={isAdmin} onNavigate={onPageChange}
        onLogout={onLogout} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
