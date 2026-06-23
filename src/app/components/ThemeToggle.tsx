"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Éviter les erreurs d'hydratation (le thème n'est connu qu'au montage côté client)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 animate-pulse">
        <div className="w-8 h-8 rounded-md bg-white dark:bg-gray-700"></div>
        <div className="w-8 h-8"></div>
        <div className="w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 transition-colors">
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
          theme === "light"
            ? "bg-white shadow-sm text-jaune dark:bg-gray-700 dark:text-jaune"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        }`}
        title="Mode Clair"
      >
        <SunIcon className="w-5 h-5" />
      </button>

      <button
        onClick={() => setTheme("system")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
          theme === "system"
            ? "bg-white shadow-sm text-indigo-600 dark:bg-gray-700 dark:text-indigo-400"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        }`}
        title="Système"
      >
        <ComputerDesktopIcon className="w-5 h-5" />
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
          theme === "dark"
            ? "bg-white shadow-sm text-blue-500 dark:bg-gray-700 dark:text-blue-400"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        }`}
        title="Mode Sombre"
      >
        <MoonIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
