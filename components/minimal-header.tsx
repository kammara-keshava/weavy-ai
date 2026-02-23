'use client';

import { useUser } from '@clerk/nextjs';
import { LogoutButton } from './logout-button';

/**
 * Minimal Header - Just shows logout button
 * Use this if you want a simpler header without user info
 */
export function MinimalHeader() {
  const { user, isLoaded } = useUser();

  // Only render if user is signed in
  if (!isLoaded || !user) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
      <h1 className="text-lg font-bold text-white">Weavy AI</h1>
      <LogoutButton />
    </header>
  );
}
