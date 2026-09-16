"use client";
import React from "react";
import Link from "next/link";
import { useSidebar } from "@/context/SidebarContext";
import UserDropdown from "@/components/header/UserDropdown";
import { Menu, X } from 'lucide-react';

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between w-full h-16 px-4 lg:px-6 bg-white/90 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/90 dark:border-gray-800">
      {/* Left: Toggle + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="lg:hidden p-2 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle Sidebar"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Ptape</span>
        </Link>
      </div>

      {/* Right: User Dropdown */}
      <UserDropdown />
    </header>
  );
};

export default AppHeader;
