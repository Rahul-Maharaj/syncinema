'use client';

/**
 * BrandedImage Component
 * Displays an image with the official glowing SynCinema watermark logo
 * permanently embedded in the right top corner.
 */
export default function BrandedImage({
  src,
  alt = 'SynCinema Artwork',
  className = '',
  imgClassName = '',
  aspect = '',
  children,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${aspect || ''} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${imgClassName}`}
        loading="lazy"
        decoding="async"
      />

      {/* Official SynCinema Watermark Logo in Right Top Corner */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-pink-500/40 text-white shadow-xl pointer-events-none select-none">
        <img
          src="/logo.png"
          alt="SynCinema Logo"
          className="h-3.5 w-3.5 object-contain shrink-0"
        />
        <span className="text-[10px] font-black tracking-tight leading-none">
          <span className="text-white">Syn</span>
          <span className="text-pink-400">Cinema</span>
        </span>
      </div>

      {children}
    </div>
  );
}
