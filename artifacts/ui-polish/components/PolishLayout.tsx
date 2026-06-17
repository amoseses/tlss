'use client';

import { AlertCircle } from 'lucide-react';

/**
 * Placeholder Layout Components for Polish
 * Use these as templates for refactoring existing pages
 */

/**
 * Clean Card Component
 * Subtle radius, good spacing, minimal shadow
 */
export function CleanCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-base shadow-sm hover:shadow-base transition-shadow duration-200 ${
        className
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Polish Section
 * Consistent padding and spacing
 */
export function PolishSection({
  title,
  subtitle,
  children,
  variant = 'light',
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'light' | 'dark';
}) {
  const bgColor = variant === 'light' ? 'bg-gray-50' : 'bg-gray-900';
  const textColor = variant === 'light' ? 'text-gray-900' : 'text-white';

  return (
    <section className={`py-16 px-6 md:px-12 ${bgColor}`}>
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${textColor}`}>
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            className={`text-lg mb-12 ${
              variant === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * Polish Button Group
 * Consistent sizing and spacing
 */
export function ButtonGroup({
  children,
  variant = 'horizontal',
}: {
  children: React.ReactNode;
  variant?: 'horizontal' | 'vertical';
}) {
  const flexClass = variant === 'horizontal' ? 'flex-row' : 'flex-col';
  return (
    <div className={`flex ${flexClass} gap-4`}>
      {children}
    </div>
  );
}

/**
 * Info Box
 * For tips, alerts, or guidance
 */
export function InfoBox({
  title,
  message,
  variant = 'info',
}: {
  title: string;
  message: string;
  variant?: 'info' | 'warning' | 'success' | 'error';
}) {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-900',
      subtext: 'text-yellow-700',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      text: 'text-green-900',
      subtext: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-900',
      subtext: 'text-red-700',
    },
  };

  const v = variants[variant];

  return (
    <div className={`p-4 ${v.bg} border ${v.border} rounded-base flex gap-3`}>
      <AlertCircle className={`flex-shrink-0 ${v.icon}`} size={20} />
      <div>
        <h4 className={`font-semibold ${v.text}`}>{title}</h4>
        <p className={`text-sm ${v.subtext}`}>{message}</p>
      </div>
    </div>
  );
}

/**
 * Grid Layout
 * Responsive grid with consistent gaps
 */
export function PolishGrid({
  children,
  cols = 3,
  gap = 6,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 4 | 6 | 8 | 12;
}) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'lg:grid-cols-4',
  }[cols];

  const gapClass = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
    12: 'gap-12',
  }[gap];

  return (
    <div className={`grid ${colsClass} ${gapClass}`}>
      {children}
    </div>
  );
}
