'use client';
import Link from 'next/link';

export default function BrandLogo({
  size = 'md', // 'sm' | 'md' | 'lg'
  href = '/',
  className = '',
  hideTextOnMobile = false,
  isLight = false,
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
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 group select-none shrink-0 cursor-pointer ${className}`}>
      {/* Brand Icon Image with smooth hover rotation & glow */}
      <div className={`relative ${iconSizes[size]} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-[0_4px_16px_rgba(236,72,153,0.55)]`}>
        <img
          src="/logo.png"
          alt="SynCinema Logo Icon"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Highlighted SynCinema Typography with Shimmer & Hover Expansion */}
      <div className={`items-baseline leading-none transition-all duration-300 ${hideTextOnMobile ? 'hidden sm:flex' : 'flex'}`}>
        <span className={`${isLight ? 'text-pink-600 font-extrabold font-display group-hover:text-pink-500' : 'brand-syn'} ${synSizes[size]} pr-0.5 transition-all duration-300 group-hover:tracking-wider`}>
          Syn
        </span>
        <span className={`${isLight ? 'text-[#1e1b4b] font-black group-hover:text-pink-600' : 'brand-cinema'} ${cinemaSizes[size]} transition-all duration-300`}>
          Cinema
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="no-underline inline-block shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
