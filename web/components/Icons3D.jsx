'use client';
import React from 'react';

/**
 * High-fidelity 3D Icons inspired by "3dicons" and "kitbitz"
 * Featuring rich lighting, ambient occlusion, specular highlights,
 * and the Electric Tangerine (#FF6D1F) + Sustainable Linen (#FAF3E1) palette.
 */

// 1. 3D Popcorn Bucket (Cinema & Extras)
export function Popcorn3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_rgba(255,109,31,0.35)]">
        <defs>
          <linearGradient id="popTub" x1="20" y1="35" x2="80" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6D1F" />
            <stop offset="0.5" stopColor="#E65306" />
            <stop offset="1" stopColor="#8A2D00" />
          </linearGradient>
          <linearGradient id="popStripe" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#FAF3E1" />
            <stop offset="1" stopColor="#F5E7C6" />
          </linearGradient>
          <radialGradient id="cornGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#FFF9E6" />
            <stop offset="60%" stopColor="#F5D061" />
            <stop offset="100%" stopColor="#E59934" />
          </radialGradient>
          <filter id="popShade" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Popcorn Kernels (Volumetric cluster) */}
        <g filter="url(#popShade)">
          <circle cx="50" cy="22" r="13" fill="url(#cornGlow)" />
          <circle cx="37" cy="26" r="11" fill="url(#cornGlow)" />
          <circle cx="63" cy="26" r="11" fill="url(#cornGlow)" />
          <circle cx="28" cy="33" r="10" fill="url(#cornGlow)" />
          <circle cx="72" cy="33" r="10" fill="url(#cornGlow)" />
          <circle cx="43" cy="31" r="11" fill="url(#cornGlow)" />
          <circle cx="57" cy="31" r="11" fill="url(#cornGlow)" />
          {/* Top highlight kernels */}
          <ellipse cx="48" cy="19" rx="5" ry="3" fill="#FFFFFF" opacity="0.6" />
          <ellipse cx="61" cy="23" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.5" />
        </g>

        {/* Popcorn Bucket */}
        <path d="M22 38 L30 92 C30.5 94 32.5 95 34.5 95 L65.5 95 C67.5 95 69.5 94 70 92 L78 38 Z" fill="url(#popTub)" />
        {/* Bucket Stripes */}
        <path d="M35 38 L39 95 L45 95 L41 38 Z" fill="url(#popStripe)" />
        <path d="M55 38 L51 95 L57 95 L61 38 Z" fill="url(#popStripe)" />
        {/* Rim */}
        <ellipse cx="50" cy="38" rx="28" ry="4.5" fill="#FF8E42" stroke="#FAF3E1" strokeWidth="1.5" />
        {/* Cinema Logo Emblem on Tub */}
        <circle cx="50" cy="66" r="10" fill="#222222" stroke="#FAF3E1" strokeWidth="1.2" />
        <path d="M47 61 L55 66 L47 71 Z" fill="#FF6D1F" />
      </svg>
    </span>
  );
}

// 2. 3D Clapperboard & Film Reel (Cinema & Movies)
export function Clapper3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_rgba(255,109,31,0.35)]">
        <defs>
          <linearGradient id="clapBody" x1="15" y1="35" x2="85" y2="88" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2E2E32" />
            <stop offset="0.5" stopColor="#222222" />
            <stop offset="1" stopColor="#141416" />
          </linearGradient>
          <linearGradient id="clapArm" x1="15" y1="20" x2="85" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6D1F" />
            <stop offset="1" stopColor="#E65306" />
          </linearGradient>
        </defs>

        {/* Board base */}
        <rect x="18" y="38" width="64" height="48" rx="6" fill="url(#clapBody)" stroke="rgba(250, 243, 225, 0.2)" strokeWidth="1.5" />
        {/* Clapper Top Arm (Angled slightly) */}
        <g transform="rotate(-12 18 36)">
          <rect x="16" y="22" width="68" height="15" rx="4" fill="url(#clapArm)" stroke="#FAF3E1" strokeWidth="1.2" />
          {/* Diagonal Stripes on Arm */}
          <path d="M26 22 L20 37 L28 37 L34 22 Z" fill="#FAF3E1" />
          <path d="M42 22 L36 37 L44 37 L50 22 Z" fill="#FAF3E1" />
          <path d="M58 22 L52 37 L60 37 L66 22 Z" fill="#FAF3E1" />
          <path d="M74 22 L68 37 L76 37 L82 22 Z" fill="#FAF3E1" />
        </g>

        {/* Hinge Pin */}
        <circle cx="18" cy="37" r="4" fill="#FAF3E1" stroke="#222222" strokeWidth="1.5" />

        {/* Board Details */}
        <line x1="24" y1="52" x2="76" y2="52" stroke="#FAF3E1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
        <line x1="24" y1="64" x2="76" y2="64" stroke="#FAF3E1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
        {/* Glow Play symbol */}
        <circle cx="50" cy="68" r="10" fill="rgba(255, 109, 31, 0.2)" />
        <path d="M47 63 L55 68 L47 73 Z" fill="#FF6D1F" />
      </svg>
    </span>
  );
}

// 3. 3D Heart (Duo Date Night & Love)
export function Heart3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_20px_rgba(255,109,31,0.5)]">
        <defs>
          <radialGradient id="heartGlow" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFAA70" />
            <stop offset="40%" stopColor="#FF6D1F" />
            <stop offset="85%" stopColor="#D94800" />
            <stop offset="100%" stopColor="#8A2500" />
          </radialGradient>
          <filter id="softGleam" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Main 3D Heart Body */}
        <path
          d="M50 86 C25 70 12 52 12 34 C12 20 23 10 37 10 C44 10 49 14 50 18 C51 14 56 10 63 10 C77 10 88 20 88 34 C88 52 75 70 50 86 Z"
          fill="url(#heartGlow)"
        />

        {/* Specular Highlight Gloss Curves */}
        <ellipse cx="32" cy="24" rx="8" ry="4" transform="rotate(-35 32 24)" fill="#FFFFFF" opacity="0.65" />
        <ellipse cx="68" cy="22" rx="6" ry="3" transform="rotate(25 68 22)" fill="#FFFFFF" opacity="0.45" />

        {/* Subtle Inner Glow */}
        <path
          d="M50 78 C32 64 20 48 20 35 C20 24 28 17 38 17 C44 17 48 20 50 24"
          stroke="#FAF3E1"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    </span>
  );
}

// 4. 3D Duo Camera (WebRTC Live Call)
export function DuoCam3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_rgba(255,109,31,0.35)]">
        <defs>
          <linearGradient id="camBody" x1="12" y1="28" x2="68" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2E2E34" />
            <stop offset="0.5" stopColor="#222222" />
            <stop offset="1" stopColor="#121214" />
          </linearGradient>
          <radialGradient id="camLens" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF9B5E" />
            <stop offset="45%" stopColor="#FF6D1F" />
            <stop offset="85%" stopColor="#8A2D00" />
            <stop offset="100%" stopColor="#1F0A00" />
          </radialGradient>
          <linearGradient id="coneGrad" x1="68" y1="50" x2="90" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6D1F" />
            <stop offset="1" stopColor="#B83E00" />
          </linearGradient>
        </defs>

        {/* Main Camera Body */}
        <rect x="12" y="30" width="54" height="42" rx="8" fill="url(#camBody)" stroke="rgba(250, 243, 225, 0.2)" strokeWidth="1.5" />

        {/* Top Camera Flash / Sensor */}
        <rect x="22" y="24" width="16" height="6" rx="2" fill="#FF6D1F" />

        {/* Large 3D Lens Ring */}
        <circle cx="39" cy="51" r="16" fill="#141416" stroke="#FAF3E1" strokeWidth="1.5" />
        <circle cx="39" cy="51" r="12" fill="url(#camLens)" />
        {/* Specular Glint on Lens */}
        <ellipse cx="36" cy="47" rx="3.5" ry="2" transform="rotate(-30 36 47)" fill="#FFFFFF" opacity="0.8" />

        {/* Projector Cone */}
        <path d="M66 42 L88 30 C89.5 29 91 30 91 32 L91 70 C91 72 89.5 73 88 72 L66 60 Z" fill="url(#coneGrad)" stroke="#FAF3E1" strokeWidth="1.2" />

        {/* Live Indicator Dot */}
        <circle cx="20" cy="38" r="3" fill="#22C55E">
          <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </span>
  );
}

// 5. 3D Cryptographic Shield (Vault & Security)
export function Shield3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_18px_rgba(255,109,31,0.4)]">
        <defs>
          <linearGradient id="shieldGrad" x1="20" y1="15" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2E2E32" />
            <stop offset="0.4" stopColor="#222222" />
            <stop offset="1" stopColor="#121214" />
          </linearGradient>
          <linearGradient id="goldEdge" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FAF3E1" />
            <stop offset="0.5" stopColor="#FF8E42" />
            <stop offset="1" stopColor="#FF6D1F" />
          </linearGradient>
        </defs>

        {/* Shield Body */}
        <path
          d="M50 12 L82 23 C82 52 68 76 50 88 C32 76 18 52 18 23 Z"
          fill="url(#shieldGrad)"
          stroke="url(#goldEdge)"
          strokeWidth="2.5"
        />

        {/* Inner Security Emblem */}
        <path
          d="M50 20 L74 28 C74 50 63 68 50 78 C37 68 26 50 26 28 Z"
          fill="none"
          stroke="rgba(250, 243, 225, 0.15)"
          strokeWidth="1.2"
        />

        {/* Golden Padlock in Center */}
        <rect x="42" y="47" width="16" height="13" rx="3" fill="#FF6D1F" stroke="#FAF3E1" strokeWidth="1.2" />
        <path d="M45 47 V42 C45 39 47 37 50 37 C53 37 55 39 55 42 V47" stroke="#FAF3E1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="53" r="1.5" fill="#FAF3E1" />
      </svg>
    </span>
  );
}

// 6. 3D Sub-second Synchronizer Bolt
export function SyncBolt3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_20px_rgba(255,109,31,0.55)]">
        <defs>
          <linearGradient id="boltGrad" x1="30" y1="10" x2="70" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.3" stopColor="#FF8E42" />
            <stop offset="0.75" stopColor="#FF6D1F" />
            <stop offset="1" stopColor="#B83E00" />
          </linearGradient>
        </defs>

        {/* 3D Lightning Bolt */}
        <path
          d="M56 10 L26 52 L48 52 L38 90 L74 44 L50 44 Z"
          fill="url(#boltGrad)"
          stroke="#FAF3E1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Specular highlights along edge */}
        <path d="M54 14 L30 50 L47 50 L40 82" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// 7. 3D VIP Cinema Ticket
export function Ticket3D({ className = 'w-10 h-10', size = 40 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_rgba(255,109,31,0.35)]">
        <defs>
          <linearGradient id="ticketGrad" x1="15" y1="25" x2="85" y2="75" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF8E42" />
            <stop offset="0.5" stopColor="#FF6D1F" />
            <stop offset="1" stopColor="#C2410C" />
          </linearGradient>
        </defs>

        <g transform="rotate(-15 50 50)">
          {/* Ticket Body with Notches */}
          <path
            d="M18 32 C22 32 25 35 25 39 C25 43 22 46 18 46 L18 68 C18 70 20 72 22 72 L78 72 C80 72 82 70 82 68 L82 46 C78 46 75 43 75 39 C75 35 78 32 82 32 L82 26 C82 24 80 22 78 22 L22 22 C20 22 18 24 18 26 Z"
            fill="url(#ticketGrad)"
            stroke="#FAF3E1"
            strokeWidth="1.5"
          />

          {/* Perforated Divider */}
          <line x1="62" y1="24" x2="62" y2="70" stroke="#FAF3E1" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

          {/* Text/Star on Ticket */}
          <text x="32" y="44" fill="#FAF3E1" fontSize="9" fontWeight="900" fontFamily="sans-serif">VIP PASS</text>
          <text x="32" y="55" fill="#FAF3E1" opacity="0.8" fontSize="6" fontWeight="600" fontFamily="sans-serif">ADMIT TWO</text>

          {/* Small Star */}
          <polygon points="72,42 74,47 79,47 75,50 77,55 72,52 67,55 69,50 65,47 70,47" fill="#FAF3E1" />
        </g>
      </svg>
    </span>
  );
}

// 8. 3D Sparkle Star (Luxury and Polish)
export function SparkleStar3D({ className = 'w-6 h-6', size = 24 }) {
  return (
    <span className={`inline-flex icon-3d-wrap shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,109,31,0.6)]">
        <path
          d="M20 2 C20 12 28 20 38 20 C28 20 20 28 20 38 C20 28 12 20 2 20 C12 20 20 12 20 2 Z"
          fill="url(#sparkleGrad)"
        />
        <defs>
          <linearGradient id="sparkleGrad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FAF3E1" />
            <stop offset="0.5" stopColor="#FF8E42" />
            <stop offset="1" stopColor="#FF6D1F" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
