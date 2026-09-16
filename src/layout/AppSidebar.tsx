"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { Video, Camera, Star, SquareStack } from 'lucide-react';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const navItems: NavItem[] = [
  { name: "Videos", icon: <Video size={20} />, path: "/video/list" },
  { name: "Studios", icon: <Camera size={20} />, path: "/studios" },
  { name: "Pornstars", icon: <Star size={20} />, path: "/pornstars" },
  { name: "Categories", icon: <SquareStack size={20} />, path: "/category" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const showLabels = isExpanded || isMobileOpen;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        className={`fixed top-16 lg:top-0 left-0 h-[calc(100vh-64px)] lg:h-screen z-50 
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
          transition-all duration-300 ease-in-out
          ${showLabels ? "w-64" : "w-20"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo - Desktop only */}
        <div className="hidden lg:flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            {showLabels && (
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Ptape</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
                  ${active
                    ? "bg-brand-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }
                  ${!showLabels ? "justify-center" : ""}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {showLabels && (
                  <span className="text-sm font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default AppSidebar;
