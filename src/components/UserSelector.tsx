import React from 'react';
import { User } from 'lucide-react';

interface UserSelectorProps {
  currentUser: 'A' | 'B';
  onUserChange: (user: 'A' | 'B') => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ currentUser, onUserChange }) => {
  return (
    <div className="flex items-center justify-center gap-1 app-surface p-1 mb-6">
      <button
        onClick={() => onUserChange('A')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
          currentUser === 'A'
            ? 'bg-mint/15 text-mint shadow-lift'
            : 'text-slate-300 hover:text-white hover:bg-slateDeep'
        }`}
      >
        <User size={18} />
        <span className="font-medium">Usuario A</span>
      </button>
      <button
        onClick={() => onUserChange('B')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
          currentUser === 'B'
            ? 'bg-mint/15 text-mint shadow-lift'
            : 'text-slate-300 hover:text-white hover:bg-slateDeep'
        }`}
      >
        <User size={18} />
        <span className="font-medium">Usuario B</span>
      </button>
    </div>
  );
};