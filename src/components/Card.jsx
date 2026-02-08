import { useState } from 'react';

export default function Card({ children, className = '', onClick, hoverable = false }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-250 ${
        onClick ? 'cursor-pointer' : ''
      } ${
        hoverable && isHovered ? '-translate-y-0.5 shadow-lg' : 'shadow-sm'
      } ${className}`}
    >
      {children}
    </div>
  );
}
