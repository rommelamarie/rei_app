
import React from 'react';

interface SpiderLilyProps {
  className?: string;
  size?: number | string;
  opacity?: number;
}

const SpiderLily: React.FC<SpiderLilyProps> = ({ className = '', size = 24, opacity = 1 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
      style={{ opacity }}
    >
      {/* Stylized Spider Lily (Higanbana) Path */}
      <path 
        d="M12 22C12 22 12 18 12 15M12 15C12 15 15 14 18 15M12 15C12 15 9 14 6 15M12 15C12 15 14 11 17 9M12 15C12 15 10 11 7 9M12 15C12 15 12 10 12 6M18 15C18 15 21 14 22 12M6 15C6 15 3 14 2 12M17 9C17 9 19 7 21 4M7 9C7 9 5 7 3 4M12 6C12 6 14 4 16 2M12 6C12 6 10 4 8 2" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <circle cx="12" cy="15" r="0.8" fill="currentColor" />
    </svg>
  );
};

export default SpiderLily;
