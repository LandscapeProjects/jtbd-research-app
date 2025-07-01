import React from 'react';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function Header() {
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    try {
      console.log('🚪 Sign out button clicked');
      await signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force redirect even if there's an error
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">J</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">JTBD Research</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">{profile?.full_name}</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}