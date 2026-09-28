import React from 'react';

interface DivergencyLogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  themeAccent?: string;
  invert?: boolean; // For dark backgrounds like sidebar or dark header
}

export const DivergencyIcon: React.FC<{ size?: number; className?: string; accentColor?: string; gradientId?: string }> = ({
  size = 32,
  className = '',
  accentColor = '#0071E3',
  gradientId = 'divergency-grad'
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="divergency AI logo icon"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary-accent, #0071E3)" />
          <stop offset="100%" stopColor="var(--primary-gradient-to, #5856D6)" />
        </linearGradient>
      </defs>

      {/* Outer stylized D contour with smooth rounded corners */}
      <path
        d="M 22 14
           L 54 14
           C 76 14, 88 28, 88 50
           C 88 72, 76 86, 54 86
           L 22 86
           L 22 14 Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner neural connection / circuit branch curving upward to node */}
      <path
        d="M 36 86
           C 36 68, 44 54, 52 46"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Neural AI Node Circle */}
      <circle
        cx="53"
        cy="44"
        r="7.5"
        fill="white"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
      />
    </svg>
  );
};

export const DivergencyLogo: React.FC<DivergencyLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  invert = false
}) => {
  const sizeMap = {
    sm: { icon: 22, text: 'text-sm', sub: 'text-[9px]', height: 'h-6' },
    md: { icon: 28, text: 'text-base', sub: 'text-[10px]', height: 'h-8' },
    lg: { icon: 36, text: 'text-lg', sub: 'text-xs', height: 'h-10' },
    xl: { icon: 46, text: 'text-2xl', sub: 'text-sm', height: 'h-12' }
  };

  const currentSize = sizeMap[size];

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <DivergencyIcon size={currentSize.icon} gradientId={`grad-icon-${size}`} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      {/* Crisp Icon with Squircle Background or direct */}
      <div className="relative flex items-center justify-center shrink-0">
        <DivergencyIcon size={currentSize.icon} gradientId={`grad-full-${size}-${invert ? 'dark' : 'light'}`} />
      </div>

      {/* Wordmark */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline tracking-tight font-bold">
          <span className={`font-extrabold tracking-tight ${invert ? 'text-white' : 'text-slate-900'} ${currentSize.text}`}>
            divergency
          </span>
          <span className={`font-black ml-1.5 px-1 py-0.2 rounded-md text-[10px] sm:text-xs tracking-wider uppercase bg-gradient-to-r from-[var(--primary-accent,#0071E3)] to-[var(--primary-gradient-to,#5856D6)] text-white shadow-2xs`}>
            AI
          </span>
        </div>
      </div>
    </div>
  );
};
