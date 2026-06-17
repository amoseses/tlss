'use client';

import { Zap } from 'lucide-react';

interface AIGiftButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
}

/**
 * Try Givit AI Button
 * High-contrast button to start the AI gift finding experience
 * Improved visibility from original design
 */

export function AIGiftButton({
  onClick,
  isLoading = false,
  variant = 'primary',
}: AIGiftButtonProps) {
  const primaryStyles =
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  const secondaryStyles =
    'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-50 focus:ring-2 focus:ring-primary-500';

  const buttonStyles = variant === 'primary' ? primaryStyles : secondaryStyles;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-base font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        buttonStyles
      }`}
      aria-label="Try Givit AI"
    >
      <Zap size={20} className="flex-shrink-0" />
      <span>{isLoading ? 'Loading...' : 'Try Givit AI'}</span>
    </button>
  );
}
