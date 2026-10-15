'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const SHAPES = ['♥', '✨', '💖', '♥', '⋆', '♥'];

// Ultra lightweight GPU-accelerated floating cinema sparks and hearts using GSAP
export default function Floaters({ n = 12 }) {
  const container = useRef();

  useEffect(() => {
    const el = container.current;
    if (!el) return;

    // Check prefers-reduced-motion
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const particles = [];
    const count = Math.min(n, 14); // Optimized particle count for low-end devices

    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      const isGold = i % 3 === 0;
      span.textContent = SHAPES[i % SHAPES.length];
      span.className = 'select-none pointer-events-none absolute bottom-[-30px] font-sans';
      span.style.color = isGold ? '#ffb380' : '#ff6fa0';
      span.style.fontSize = `${11 + Math.random() * 14}px`;
      span.style.opacity = '0';
      span.style.left = `${Math.random() * 96}%`;
      span.style.transform = 'translate3d(0, 0, 0)';
      span.style.willChange = 'transform, opacity';
      el.appendChild(span);

      const dur = 12 + Math.random() * 12;
      const drift = (Math.random() - 0.5) * 80;
      const maxO = 0.15 + Math.random() * 0.25;

      const tween = gsap.timeline({ repeat: -1, delay: i * (dur / count) })
        .fromTo(span, 
          { y: 0, x: 0, opacity: 0 },
          { opacity: maxO, duration: 1.5, ease: 'sine.inOut' }
        )
        .to(span, {
          y: -window.innerHeight - 80,
          x: drift,
          duration: dur,
          ease: 'none',
        }, 0)
        .to(span, {
          opacity: 0,
          duration: 2,
          ease: 'power1.in',
        }, dur - 2);

      particles.push({ span, tween });
    }

    return () => {
      particles.forEach(({ span, tween }) => {
        tween.kill();
        span.remove();
      });
    };
  }, [n]);

  return <div ref={container} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" />;
}
