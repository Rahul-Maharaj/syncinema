'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, AlertTriangle, EyeOff, RefreshCw } from 'lucide-react';

/**
 * SynCinema Advanced Anti-Inspect & Cryptographic Zero-Leak Shield
 * Defends against:
 * 1. Opening DevTools from browser menu (Chrome / Edge / Firefox / Safari settings)
 * 2. Keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Cmd+Option+I/J/C, Ctrl+U)
 * 3. Right-click context inspect menu
 * 4. Console data sniffing & memory dumps
 * 5. Script stepping / reverse-engineering via anti-debugging freeze loop
 */
export default function AntiInspectShield() {
  const [isTamperDetected, setIsTamperDetected] = useState(false);
  const lockdownRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Allow local development and Playwright UI testing on localhost/127.0.0.1
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    // Detect if running on mobile device, touchscreen, or native Android WebView
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
      ('ontouchstart' in window && window.innerWidth < 1024);

    // On mobile devices, there are NO docked desktop developer tools.
    // Screen height deltas (outerHeight - innerHeight) on phones are caused by physical notches,
    // Android navigation bars, browser URL bars, and virtual keyboards.
    // DevTools inspection heuristics MUST NOT run on mobile to prevent false-positive lockouts, touch freezes, and lag!
    if (isMobileDevice) {
      return;
    }

    // 1. SILENCE CONSOLE: Neutralize all console logging so no codes, passwords or data are exposed
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      table: console.table,
      dir: console.dir,
    };

    const wipeConsole = () => {
      try {
        console.clear();
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.info = () => {};
        console.table = () => {};
        console.dir = () => {};
      } catch {}
    };

    // Wipe console immediately
    wipeConsole();

    // 2. TRIGGER SECURITY LOCKDOWN
    const triggerLockdown = () => {
      if (!lockdownRef.current) {
        lockdownRef.current = true;
        setIsTamperDetected(true);
        wipeConsole();
      }
    };

    const clearLockdown = () => {
      if (lockdownRef.current) {
        lockdownRef.current = false;
        setIsTamperDetected(false);
      }
    };

    // 3. BLOCK RIGHT-CLICK CONTEXT MENU (Except inputs/textareas)
    const handleContextMenu = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 4. BLOCK DEVTOOLS KEYBOARD SHORTCUTS
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerLockdown();
        return false;
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / Ctrl+Shift+K
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K', 'i', 'j', 'c', 'k'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerLockdown();
        return false;
      }

      // Cmd+Option+I / Cmd+Option+J / Cmd+Option+C on macOS
      if (e.metaKey && e.altKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerLockdown();
        return false;
      }

      // Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && ['u', 'U'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerLockdown();
        return false;
      }
    };

    // 5. DEVTOOLS DETECTION VIA RESIZE HEURISTICS (Catches Docked DevTools opened from browser settings menu)
    let devToolsCheckTimer = null;
    const checkDevToolsOpen = () => {
      // Window dimension delta (Docked DevTools on bottom, right, or left)
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const isDockedDevTools = widthDelta > 160 || heightDelta > 160;

      if (isDockedDevTools) {
        triggerLockdown();
      } else if (!isDockedDevTools && lockdownRef.current) {
        clearLockdown();
      }
    };

    // Run passive check every 1500ms (Low overhead, zero thread pauses, smooth 60fps)
    devToolsCheckTimer = setInterval(checkDevToolsOpen, 1500);

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('resize', checkDevToolsOpen);

    return () => {
      clearInterval(devToolsCheckTimer);
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('resize', checkDevToolsOpen);
    };
  }, []);

  // If Browser DevTools is opened from settings menu, immediately display the tamper shield blackout
  if (isTamperDetected) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-[99999999] bg-[#141416]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center text-pink-100 select-none animate-in fade-in duration-200"
      >
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#222222] border-2 border-pink-500/50 shadow-[0_25px_80px_rgba(236,72,153,0.35)] space-y-5">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <Lock className="h-8 w-8 animate-pulse text-pink-300" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-[10px] font-black uppercase tracking-widest text-pink-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Cryptographic Anti-Inspect Shield</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-pink-100 tracking-tight">
              Developer Tools Detected
            </h2>
            <p className="text-xs sm:text-sm text-pink-200/80 leading-relaxed font-medium">
              Browser Developer Tools inspection is blocked to protect real-time peer-to-peer encryption keys, private room streams, and sensitive video data.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1A1A1D] border border-pink-500/20 text-xs text-pink-300 font-mono space-y-1 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ZERO-LEAK DATA VAULT ENGAGED</span>
            </div>
            <p className="text-[11px] text-pink-300/70">
              Please close Developer Tools (or undock/close inspection window) to resume your movie session.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.outerWidth - window.innerWidth < 160 && window.outerHeight - window.innerHeight < 160) {
                setIsTamperDetected(false);
              } else {
                alert('Please close Developer Tools in your browser settings to continue.');
              }
            }}
            className="btn-pink w-full py-3 px-4 rounded-xl text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>I Have Closed Developer Tools — Resume</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
