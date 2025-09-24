import React from 'react';
import { User } from 'lucide-react';

interface UserSelectorProps {
  currentUser: 'A' | 'B';
  onUserChange: (user: 'A' | 'B') => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ currentUser, onUserChange }) => {
  return (
    <div className="flex items-center justify-center space-x-1 bg-gray-800 rounded-lg p-1 mb-6">
      <button
        onClick={() => onUserChange('A')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
          currentUser === 'A'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <User size={18} />
        <span className="font-medium">Usuario A</span>
      </button>
      <button
        onClick={() => onUserChange('B')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
          currentUser === 'B'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <User size={18} />
        <span className="font-medium">Usuario B</span>
      </button>
    </div>
  );
};