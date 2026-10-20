// Production-Grade Small Dynamic Room Invite System
// Generates compact, clean, dynamic links that never wrap or break in WhatsApp,
// Telegram, Instagram, SMS, or mobile in-app webviews.

export function getSmallInviteUrl(origin, roomId, pass) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanRoom = encodeURIComponent(String(roomId || '').trim());
  if (!cleanRoom) return base;
  if (!pass) {
    return `${base}/room/${cleanRoom}`;
  }
  return `${base}/room/${cleanRoom}?p=${encodeURIComponent(String(pass).trim())}`;
}

export async function fetchDynamicShortInvite(roomId, pass, key) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fallback = getSmallInviteUrl(origin, roomId, pass);

  try {
    const res = await fetch('/api/invite/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, pass, key }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.shortUrl) {
        return {
          code: data.code,
          shortUrl: data.shortUrl,
          directUrl: data.directUrl || fallback,
        };
      }
    }
  } catch {}

  return {
    code: '',
    shortUrl: fallback,
    directUrl: fallback,
  };
}

export function createHybridInvite(roomId, pass, key) {
  if (!roomId) return '';
  const cleanRoom = String(roomId).trim();
  const payload = JSON.stringify({
    p: pass || '',
    k: key || '',
    r: cleanRoom,
    t: Date.now(),
  });

  const salt = 'sc_vault_' + cleanRoom.toLowerCase();
  let enc = '';
  for (let i = 0; i < payload.length; i++) {
    enc += String.fromCharCode(payload.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }

  // URL-safe Base64 encoding without padding
  const base64 = typeof btoa !== 'undefined'
    ? btoa(enc)
    : Buffer.from(enc, 'binary').toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function parseHybridInvite(ticket, expectedRoomId) {
  if (!ticket || !expectedRoomId) return null;
  try {
    let clean = String(ticket).trim();
    try { clean = decodeURIComponent(clean); } catch {}
    clean = clean.replace(/\s+/g, '');

    let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const dec = typeof atob !== 'undefined'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');

    const cleanExpected = String(expectedRoomId).trim();
    const candidateSalts = [
      'sc_vault_' + cleanExpected.toLowerCase(),
      'sc_vault_' + cleanExpected,
    ];

    for (const salt of candidateSalts) {
      try {
        let raw = '';
        for (let i = 0; i < dec.length; i++) {
          raw += String.fromCharCode(dec.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
        }

        const data = JSON.parse(raw);
        if (data && String(data.r).toLowerCase() === cleanExpected.toLowerCase()) {
          return {
            pass: data.p || '',
            key: data.k || '',
            createdAt: data.t || 0,
          };
        }
      } catch {}
    }
  } catch {}
  return null;
}

// Generate compact, small invite URL (default for all sharing)
export function getHybridInviteUrl(origin, roomId, pass, key) {
  return getSmallInviteUrl(origin, roomId, pass);
}
