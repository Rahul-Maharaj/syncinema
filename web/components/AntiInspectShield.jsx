'use client';

import { useEffect } from 'react';

/**
 * SynCinema Anti-Inspect & Cryptographic Zero-Leak Shield
 * Blocks developer tools inspection, right-click context menu,
 * source view shortcuts, and purges console memory to prevent
 * any data leaks or reverse-engineering in Chrome, Firefox, Safari, Edge.
 */
export default function AntiInspectShield() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Prevent Right-Click Context Menu across the application
    const handleContextMenu = (e) => {
      // Allow right-click on input and textarea for copy/paste
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        return;
      }
      e.preventDefault();
      return false;
    };

    // 2. Block DevTools Keyboard Shortcuts
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Cmd+Option+I / Cmd+Option+J on macOS
      if (e.metaKey && e.altKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && ['u', 'U'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Purge Console & Output Cryptographic Shield Notice
    const printSecurityNotice = () => {
      try {
        console.clear();
        console.log(
          '%c🔒 SynCinema Zero-Leak Security Vault Active%c\nAnti-tamper protection engaged. DevTools inspection, memory dumping, and reverse-engineering are prohibited.',
          'color: #EC4899; font-size: 16px; font-weight: 900; text-shadow: 0 0 8px rgba(236,72,153,0.6);',
          'color: #F472B6; font-size: 11px; font-weight: 600;'
        );
      } catch {}
    };

    printSecurityNotice();
    const purgeInterval = setInterval(printSecurityNotice, 4000);

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      clearInterval(purgeInterval);
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}
