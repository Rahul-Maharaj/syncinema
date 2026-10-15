'use client';
import { useEffect, useState } from 'react';

const SHAPES = ['♥', '✨', '💖', '♥', '⋆', '♥'];

// Soft hearts and cinema golden sparkles drifting upward
export default function Floaters({ n = 16 }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    setItems(Array.from({ length: n }, (_, i) => ({
      char: SHAPES[i % SHAPES.length],
      left: Math.random() * 100,
      size: 10 + Math.random() * 16,
      dur: 13 + Math.random() * 16,
      delay: -Math.random() * 24,
      drift: (Math.random() - 0.5) * 110,
      o: 0.12 + Math.random() * 0.28,
      color: i % 3 === 0 ? '#ffb380' : '#ff6fa0', // warm cinema gold & soft romantic rose
    })));
  }, [n]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className="floater select-none"
          style={{
            left: it.left + '%',
            fontSize: it.size,
            color: it.color,
            animationDuration: it.dur + 's',
            animationDelay: it.delay + 's',
            '--drift': it.drift + 'px',
            '--o': it.o,
          }}
        >
          {it.char}
        </span>
      ))}
    </div>
  );
}
