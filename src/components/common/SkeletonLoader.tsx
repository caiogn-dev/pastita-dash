import React from 'react';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 p-4 ${className}`} aria-busy="true" aria-label="Carregando...">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 rounded-md animate-shimmer bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] dark:from-[var(--dark-bg-hover,#161616)] dark:via-[var(--dark-bg-card,#1a1a1a)] dark:to-[var(--dark-bg-hover,#161616)] bg-[length:200%_100%]"
        style={{ width: `${[85, 65, 75][i % 3]}%` }}
      />
    ))}
  </div>
);
