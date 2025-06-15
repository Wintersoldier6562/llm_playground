import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const UserIcon: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user); // Assumes user object has a 'name' property
  // You can fetch user info from state if you want to show initials or avatar
  // const user = useSelector((state: RootState) => state.auth.user);
  const [hovered, setHovered] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <div
      className="fixed top-6 right-8 z-[9999] w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
      {hovered && user?.full_name && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-150 opacity-100">
          {user.full_name}
        </div>
      )}
    </div>
  );
};

export default UserIcon; 