'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ShortInviteRedirect() {
  const { code } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!code) return;
    const cleanCode = String(code).trim().toLowerCase();

    fetch(`/api/invite/resolve/${cleanCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.roomId) {
          if (data.pass) {
            try {
              sessionStorage.setItem('rp_' + data.roomId, data.pass);
              localStorage.setItem('rp_' + data.roomId, data.pass);
            } catch {}
          }
          router.replace(`/room/${encodeURIComponent(data.roomId)}${data.pass ? `?p=${encodeURIComponent(data.pass)}` : ''}`);
        } else {
          router.replace(`/?join=${encodeURIComponent(cleanCode)}`);
        }
      })
      .catch(() => {
        router.replace(`/?join=${encodeURIComponent(cleanCode)}`);
      });
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#222222] flex flex-col items-center justify-center p-4 text-center">
      <div className="card max-w-sm p-6 rounded-3xl bg-[#222222]/95 border border-pink-500/25 shadow-2xl shadow-pink-500/10 space-y-3">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-2xl animate-pulse">
          🍿
        </div>
        <h2 className="text-base font-bold text-pink-100">Connecting to Cinema Room…</h2>
        <p className="text-xs text-pink-300/70">Connecting your seat to the synchronized couch.</p>
      </div>
    </div>
  );
}
