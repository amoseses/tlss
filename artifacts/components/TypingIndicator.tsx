'use client';

/**
 * Typing Indicator Component
 * Shows "Givit is thinking..." with animated dots
 */

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-4">
      <span className="text-sm text-gray-600">Givit is thinking</span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-typing-pulse" />
        <span
          className="w-2 h-2 bg-primary-500 rounded-full animate-typing-pulse"
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="w-2 h-2 bg-primary-500 rounded-full animate-typing-pulse"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  );
}
