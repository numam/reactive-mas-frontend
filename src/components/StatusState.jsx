/** Loading spinner */
export function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-violet-200 dark:border-violet-900 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
    </div>
  );
}

/** Error banner */
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load data</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-800 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Inline skeleton block */
export function Skeleton({ className = "h-6 w-full" }) {
  return (
    <div className={`rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`} />
  );
}
