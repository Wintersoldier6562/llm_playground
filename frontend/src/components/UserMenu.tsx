import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserMenu: React.FC = () => {
  const { user } = useAuth(); // Assumes user object has name and email
  const firstLetter = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="relative flex items-center justify-end h-16">
      <div className="group cursor-pointer flex items-center">
        {/* User Icon */}
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">
          {firstLetter}
        </div>
        {/* Tooltip/Dropdown */}
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
          <div className="p-4">
            <div className="font-semibold text-gray-900">{user?.name || 'User'}</div>
            <div className="text-sm text-gray-500">{user?.email || ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
};