"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  color?: string;
  barColor?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, color, barColor, size = 'md', showValue = false, ...props }, ref) => {
    const percentage = value != null ? Math.min(Math.max(0, (value / max) * 100), 100) : 0;
    
    // Determine height based on size
    const getHeight = () => {
      switch (size) {
        case 'sm': return 'h-1.5';
        case 'lg': return 'h-3';
        default: return 'h-2'; // md
      }
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-gray-200',
          getHeight(),
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full w-full flex-1 rounded-full transition-all duration-300 ease-in-out',
            !barColor && 'bg-blue-600'
          )}
          style={{ 
            width: `${percentage}%`,
            backgroundColor: barColor || undefined
          }}
        />
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
