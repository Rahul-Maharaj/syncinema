/**
 * SyncCinema Companion Extension - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const tabTitleEl = document.getElementById('tabTitle');
  const tabDomainEl = document.getElementById('tabDomain');
  const btnStartParty = document.getElementById('btnStartParty');
  const btnCopyInvite = document.getElementById('btnCopyInvite');
  const inputRoomId = document.getElementById('inputRoomId');
  const btnJoinRoom = document.getElementById('btnJoinRoom');
  const toggleSettings = document.getElementById('toggleSettings');
  const settingsBox = document.getElementById('settingsBox');
  const inputServerUrl = document.getElementById('inputServerUrl');

  let currentTab = null;

  // Load configured server URL from storage
  if (chrome.storage?.local) {
    chrome.storage.local.get(['serverUrl'], (res) => {
      if (res?.serverUrl) inputServerUrl.value = res.serverUrl;
    });
  }

  // Get active tab details
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    if (currentTab) {
      tabTitleEl.textContent = currentTab.title || 'Active Tab';
      try {
        const u = new URL(currentTab.url);
        tabDomainEl.textContent = u.hostname;
      } catch {
        tabDomainEl.textContent = currentTab.url;
      }
    }
  } catch (err) {
    tabTitleEl.textContent = 'Could not read tab';
  }

  // Toggle server settings drawer
  toggleSettings.addEventListener('click', () => {
    settingsBox.classList.toggle('open');
  });

  inputServerUrl.addEventListener('change', () => {
    const val = inputServerUrl.value.trim().replace(/\/+$/, '');
    if (chrome.storage?.local) {
      chrome.storage.local.set({ serverUrl: val });
    }
  });

  const getServerUrl = () => {
    return (inputServerUrl.value || 'http://localhost:8080').trim().replace(/\/+$/, '');
  };

  const generateRoomId = () => {
    return 'sc-' + Math.random().toString(36).substring(2, 8);
  };

  // Start 1-Click Watch Party
  btnStartParty.addEventListener('click', () => {
    const server = getServerUrl();
    const roomId = generateRoomId();
    const videoUrl = currentTab?.url || '';
    const targetUrl = `${server}/room/${roomId}#video=${encodeURIComponent(videoUrl)}`;
    chrome.tabs.create({ url: targetUrl });
  });

  // Copy Room Invite Link
  btnCopyInvite.addEventListener('click', () => {
    const server = getServerUrl();
    const roomId = generateRoomId();
    const videoUrl = currentTab?.url || '';
    const inviteUrl = `${server}/room/${roomId}#video=${encodeURIComponent(videoUrl)}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      btnCopyInvite.innerHTML = '<span>✅ Copied! Send to partner</span>';
      setTimeout(() => {
        btnCopyInvite.innerHTML = '<span>📋 Copy Room Invite Link</span>';
      }, 2000);
    });
  });

  // Join Existing Room
  btnJoinRoom.addEventListener('click', () => {
    const r = inputRoomId.value.trim();
    if (!r) return;
    const server = getServerUrl();
    const targetUrl = r.startsWith('http') ? r : `${server}/room/${r}`;
    chrome.tabs.create({ url: targetUrl });
  });
});
