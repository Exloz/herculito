import React from 'react';

interface HiitProgressRingProps {
  progress: number;
  phaseColor: string;
  children: React.ReactNode;
}

export const HiitProgressRing: React.FC<HiitProgressRingProps> = ({ progress, phaseColor, children }) => {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={280}
        height={280}
        viewBox={`0 0 ${280} ${280}`}
      >
        {/* Background circle */}
        <circle
          cx={140}
          cy={140}
          r={radius}
          stroke="currentColor"
          strokeWidth={8}
          fill="none"
          className="text-slateDeep"
        />
        {/* Progress circle */}
        <circle
          cx={140}
          cy={140}
          r={radius}
          stroke="currentColor"
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${phaseColor} transition-all duration-300`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};