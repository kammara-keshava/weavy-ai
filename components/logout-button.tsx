'use client';

import { SignOutButton } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <SignOutButton redirectUrl="/">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200"
        title="Sign out of your account"
      >
        <LogOut size={18} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </SignOutButton>
  );
}
