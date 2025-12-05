import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A reusable loading spinner component that can be used throughout the application
 * with consistent styling and behavior.
 */
export default function LoadingSpinner({ text = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  // Determine sizing based on the size prop
  const spinnerSize = size === 'sm' 
    ? 'h-6 w-6' 
    : size === 'md' 
      ? 'h-8 w-8' 
      : 'h-12 w-12';
  
  const textSize = size === 'sm'
    ? 'text-xs'
    : size === 'md'
      ? 'text-sm'
      : 'text-base';
  
  return (
    <div className="flex justify-center items-center min-h-[150px]">
      <div className="text-center">
        <div className={`inline-block ${spinnerSize} animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent`}></div>
        <p className={`mt-4 ${textSize} text-gray-500`}>{text}</p>
      </div>
    </div>
  );
} 