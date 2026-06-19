import React from 'react';

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-2 p-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} data-testid="skeleton-card" className="h-20 animate-pulse rounded-xl bg-bg-card" />
    ))}
  </div>
);
