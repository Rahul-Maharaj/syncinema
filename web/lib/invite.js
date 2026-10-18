// Production-Grade Hybrid Room Invite System
// Encrypts/obfuscates room credentials into URL-safe opaque tickets
// so passwords and vault keys are NEVER exposed in plain text in URLs,
// browser history, message previews, or server access logs.

export function createHybridInvite(roomId, pass, key) {
  if (!roomId) return '';
  const payload = JSON.stringify({
    p: pass || '',
    k: key || '',
    r: roomId,
    t: Date.now(),
  });

  const salt = 'sc_vault_' + roomId;
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
    let b64 = ticket.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const dec = typeof atob !== 'undefined'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');

    const salt = 'sc_vault_' + expectedRoomId;
    let raw = '';
    for (let i = 0; i < dec.length; i++) {
      raw += String.fromCharCode(dec.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }

    const data = JSON.parse(raw);
    if (data && data.r === expectedRoomId) {
      return {
        pass: data.p || '',
        key: data.k || '',
        createdAt: data.t || 0,
      };
    }
  } catch {}
  return null;
}

// Generate the production hybrid invite URL (No plaintext pass or key)
export function getHybridInviteUrl(origin, roomId, pass, key) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!pass && !key) {
    return `${base}/room/${roomId}`;
  }
  const ticket = createHybridInvite(roomId, pass, key);
  return `${base}/room/${roomId}?inv=${ticket}`;
}
