import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

export function UserProfile({ user, onLogout }: UserProfileProps) {
  return (
    <div className="flex items-center justify-between p-4 app-header">
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-mint rounded-full flex items-center justify-center">
            <UserIcon size={20} className="text-ink" />
          </div>
        )}
        <div>
          <p className="text-white font-medium">{user.name}</p>
          <p className="text-slate-400 text-sm">{user.email}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="btn-ghost"
        title="Cerrar sesión"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}
