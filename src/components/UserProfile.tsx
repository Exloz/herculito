import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

export function UserProfile({ user, onLogout }: UserProfileProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center space-x-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <UserIcon size={20} className="text-white" />
          </div>
        )}
        <div>
          <p className="text-white font-medium">{user.name}</p>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
        title="Cerrar sesión"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}