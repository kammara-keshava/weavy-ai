'use client';

import { useUser } from '@clerk/nextjs';
import { LogoutButton } from './logout-button';

export function Header() {
  const { user, isLoaded } = useUser();

  // Only render if user is signed in
  if (!isLoaded || !user) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700 shadow-lg flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white">
          Weavy AI
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end text-sm">
          <p className="font-medium text-white">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-slate-400 text-xs">
            {user.emailAddresses[0]?.emailAddress}
          </p>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
