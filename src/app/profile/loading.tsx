export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-gray-900">
      {/* Barre de progression */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--blue)]/20">
        <div className="h-full bg-[var(--jaune)] rounded-full animate-progress" />
      </div>

      {/* Squelette du profil */}
      <div className="h-[300px] bg-gray-300 dark:bg-gray-800 w-full animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 mt-4 animate-pulse">
        <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 border-4 border-white dark:border-gray-900" />
        <div className="mt-4 h-7 w-48 bg-gray-300 dark:bg-gray-700 rounded-lg" />
        <div className="mt-2 h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}
