'use client';
import Link from 'next/link';

export default function BrandLogo({
  size = 'md', // 'sm' | 'md' | 'lg'
  href = '/',
  className = '',
}) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10 sm:h-11 sm:w-11',
    lg: 'h-14 w-14 sm:h-16 sm:w-16',
  };

  const synSizes = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-4xl sm:text-5xl',
  };

  const cinemaSizes = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-3xl sm:text-4xl',
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}>
      {/* Brand Icon Image (New SC Heart Film Strip) */}
      <div className={`relative ${iconSizes[size]} shrink-0 transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_4px_16px_rgba(255,109,31,0.55)]`}>
        <img
          src="/logo.png"
          alt="SynCinema Logo Icon"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Highlighted SynCinema Typography */}
      <div className="flex items-baseline leading-none">
        <span className={`brand-syn ${synSizes[size]} pr-0.5`}>Syn</span>
        <span className={`brand-cinema ${cinemaSizes[size]}`}>Cinema</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="no-underline inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
