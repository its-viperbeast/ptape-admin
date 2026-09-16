"use client";
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { clearAuthToken, getLastLogin } from '@/utils/auth';
import { timeAgo } from '@/utils/commonFunc';

export default function UserDropdown() {
  const router = useRouter();
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    setLastLogin(getLastLogin());
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
        {lastLogin ? `Last login ${timeAgo(lastLogin)}` : 'First login'}
      </span>
      <button
        onClick={handleLogout}
        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors"
        title="Sign Out"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
