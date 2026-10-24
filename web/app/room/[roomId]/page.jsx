'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  Send, Copy, Check, Crown, Users, Lock, Unlock, Heart, Film, X, Play,
  Moon, Home as HomeIcon, Eye, EyeOff, Trash2, KeyRound, User,
  Video, VideoOff, Mic, MicOff, Sliders, MessageSquare, MoreHorizontal, ListPlus, Sparkles, Settings,
  Timer, Popcorn, Flame, Shield, Star, QrCode, Smartphone, History, DoorClosed, LogOut, Tv,
  MonitorPlay, Camera, Music, RefreshCw, Palette, Maximize2, UserX, Volume2, VolumeX, Download
} from 'lucide-react';
import { getSocket, getCid } from '@/lib/socket';
import { getKey, setKey } from '@/lib/vault';
import { getHybridInviteUrl, getSmallInviteUrl, fetchDynamicShortInvite, parseHybridInvite } from '@/lib/invite';
import VideoPlayer from '@/components/VideoPlayer';
import CouplesOverlay, { Tile } from '@/components/CouplesOverlay';
import CallErrorBoundary from '@/components/CallErrorBoundary';
import CinemaPlugins from '@/components/CinemaPlugins';
import CoupleGestures from '@/components/CoupleGestures';
import MovieNightExtras from '@/components/MovieNightExtras';
import IntimacyMode from '@/components/IntimacyMode';
import WatchHistoryModal from '@/components/WatchHistoryModal';
import RecentBar from '@/components/RecentBar';
import ThemeToggle from '@/components/ThemeToggle';
import InstallPrompt from '@/components/InstallPrompt';
import ChatPanel from '@/components/ChatPanel';
import BrandLogo from '@/components/BrandLogo';
import {
  Popcorn3D,
  Clapper3D,
  Heart3D,
  DuoCam3D,
  Shield3D,
  SyncBolt3D,
  Ticket3D,
  SparkleStar3D,
} from '@/components/Icons3D';
import { detectRealLocation } from '@/lib/locationDetector';
import { isRealHumanBrowser, getHumanProofToken } from '@/lib/antiBot';

// Curated Cinema Color Themes (Cozy Pink Romance & Velvet default matching home-bg.jpg)
export const ROOM_THEMES = {
  tangerine: {
    id: 'tangerine',
    name: 'Cozy Pink Romance',
    tag: 'Romantic Pink & Cozy Cinema Ambiance',
    icon: '💕',
    bgClass: 'bg-[#222222]',
    navBg: 'bg-[#222222]/95 border-pink-500/20 shadow-lg shadow-black/40',
    asideBg: 'bg-[#222222]/95 border-pink-500/20',
    tabBg: 'bg-[#222222]',
    overlayGradient: 'bg-gradient-to-t from-[#222222] via-[#222222]/65 to-[#222222]/45',
    ambientGlow: 'bg-pink-500/10',
    borderColor: 'border-pink-500/25',
    cardBorder: 'border-pink-500/30 shadow-xl shadow-pink-500/10',
    accentGradient: 'from-pink-500 via-rose-500 to-pink-400',
    accentText: 'text-pink-100',
    accentBg: 'bg-pink-600',
    themeBtnClass: 'btn-pink text-white hover:brightness-110 shadow-md shadow-pink-500/30',
    swatches: ['#222222', '#F472B6', '#EC4899', '#FCE7F3'],
    showWallpaperDefault: true,
  },
  midnight: {
    id: 'midnight',
    name: 'Soft Blush Ambiance',
    tag: 'Cozy Pastel Rose Ambiance',
    icon: '🌸',
    bgClass: 'bg-[#222222]',
    navBg: 'bg-[#222222]/90 border-pink-500/20 shadow-lg shadow-black/40',
    asideBg: 'bg-[#222222]/90 border-pink-500/20',
    tabBg: 'bg-[#222222]/95',
    overlayGradient: 'bg-gradient-to-b from-[#222222]/80 via-[#222222]/60 to-[#222222]/85',
    ambientGlow: 'bg-pink-400/15',
    borderColor: 'border-pink-500/30',
    cardBorder: 'border-pink-500/40 shadow-xl shadow-black/50',
    accentGradient: 'from-pink-400 via-rose-400 to-pink-100',
    accentText: 'text-pink-100',
    accentBg: 'bg-pink-500',
    themeBtnClass: 'btn-pink text-white hover:brightness-110 shadow-md shadow-pink-500/30',
    swatches: ['#222222', '#F472B6', '#FCE7F3', '#FBCFE8'],
    showWallpaperDefault: true,
  },
  neon: {
    id: 'neon',
    name: 'Cyberpunk Neon',
    tag: 'Electric Auditorium • Cyan & Magenta',
    icon: '⚡',
    bgClass: 'bg-[#222222]',
    navBg: 'bg-[#222222]/95 border-pink-500/20',
    asideBg: 'bg-[#222222]/95 border-pink-500/20',
    tabBg: 'bg-[#222222]/95',
    overlayGradient: 'bg-gradient-to-t from-[#222222] via-[#222222]/60 to-[#222222]/80',
    ambientGlow: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/25',
    cardBorder: 'border-cyan-500/35',
    accentGradient: 'from-cyan-500 via-purple-600 to-fuchsia-500',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500',
    themeBtnClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25',
    swatches: ['#222222', '#06b6d4', '#d946ef'],
    showWallpaperDefault: false,
  },
  velvet: {
    id: 'velvet',
    name: 'Velvet Lounge',
    tag: 'Warm Candlelight • Amber & Crimson',
    icon: '🕯️',
    bgClass: 'bg-[#222222]',
    navBg: 'bg-[#222222]/95 border-pink-500/20',
    asideBg: 'bg-[#222222]/95 border-pink-500/20',
    tabBg: 'bg-[#222222]/95',
    overlayGradient: 'bg-gradient-to-t from-[#222222] via-[#222222]/60 to-[#222222]/80',
    ambientGlow: 'bg-amber-500/15',
    borderColor: 'border-amber-500/25',
    cardBorder: 'border-amber-500/35',
    accentGradient: 'from-amber-500 via-rose-600 to-red-700',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    themeBtnClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25',
    swatches: ['#222222', '#f59e0b', '#dc2626'],
    showWallpaperDefault: false,
  },
  aurora: {
    id: 'aurora',
    name: 'Emerald Aurora',
    tag: 'Starlight Cinema • Mint & Forest Teal',
    icon: '✨',
    bgClass: 'bg-[#222222]',
    navBg: 'bg-[#222222]/95 border-pink-500/20',
    asideBg: 'bg-[#222222]/95 border-pink-500/20',
    tabBg: 'bg-[#222222]/95',
    overlayGradient: 'bg-gradient-to-t from-[#222222] via-[#222222]/60 to-[#222222]/80',
    ambientGlow: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/25',
    cardBorder: 'border-emerald-500/35',
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500',
    themeBtnClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25',
    swatches: ['#222222', '#10b981', '#06b6d4'],
    showWallpaperDefault: false,
  },
  obsidian: {
    id: 'obsidian',
    name: 'Pure Obsidian',
    tag: 'OLED Zero Glare • Minimalist Silver',
    icon: '🌑',
    bgClass: 'bg-[#222222]',
    navBg: 'bg-[#222222]/95 border-pink-500/20',
    asideBg: 'bg-[#222222]/95 border-pink-500/20',
    tabBg: 'bg-[#222222]/95',
    overlayGradient: 'bg-[#222222]/95',
    ambientGlow: 'bg-transparent',
    borderColor: 'border-white/10',
    cardBorder: 'border-pink-500/25',
    accentGradient: 'from-zinc-600 via-zinc-400 to-white',
    accentText: 'text-slate-200',
    accentBg: 'bg-white',
    themeBtnClass: 'bg-white/10 border-white/15 text-white hover:bg-white/15',
    swatches: ['#222222', '#71717a', '#ffffff'],
    showWallpaperDefault: false,
  },
  offwhite: {
    id: 'offwhite',
    name: 'Sunset Terrace (Light)',
    tag: 'Penthouse Skyline • Warm Sunset Ivory & Rose',
    icon: '🌅',
    bgClass: 'bg-[#faf6f8] text-slate-900',
    wallpaper: '/sunset-cinema-bg.jpg?v=couple2',
    navBg: 'bg-white/95 border-b border-rose-200/90 shadow-[0_4px_25px_rgba(244,63,94,0.08)] text-slate-900 backdrop-blur-2xl',
    asideBg: 'bg-white/95 border-2 border-rose-200/90 shadow-[0_12px_40px_rgba(244,63,94,0.08)] text-slate-900 backdrop-blur-2xl',
    tabBg: 'bg-rose-50/70 border-b border-rose-200/80 text-slate-800',
    overlayGradient: 'bg-gradient-to-b from-white/90 via-[#fff8fa]/80 to-rose-50/90 backdrop-blur-[2px]',
    ambientGlow: 'bg-rose-400/20',
    borderColor: 'border-rose-200',
    cardBorder: 'border-2 border-rose-200/90 shadow-[0_10px_35px_rgba(244,63,94,0.08)]',
    accentGradient: 'from-rose-500 via-pink-600 to-rose-600',
    accentText: 'text-rose-700 font-bold',
    accentBg: 'bg-rose-600',
    themeBtnClass: 'bg-white hover:bg-rose-50 border-2 border-rose-200 text-slate-800 shadow-sm font-semibold',
    swatches: ['#FFFFFF', '#FDF2F8', '#FB7185', '#E11D48'],
    showWallpaperDefault: true,
    isLight: true,
  },
};

const hello = (n) => {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 660;
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
    o.start(); o.stop(c.currentTime + 0.6);
  } catch {}
  if (document.hidden && window.Notification?.permission === 'granted') new Notification(`${n} is here 💗`);
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const Gate = ({ icon, title, hint, onSubmit, cta, children }) => (
  <main className="grid min-h-screen place-items-center px-6 bg-[#222222] relative overflow-hidden">
    {/* Ambient Cinema Background */}
    <div 
      className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-55 transition-opacity"
      style={{ backgroundImage: `url('/home-bg.jpg')`, backgroundPosition: 'center 40%' }}
    />
    <div className="fixed inset-0 z-0 bg-gradient-to-t from-[#222222] via-[#222222]/70 to-[#222222]/40 pointer-events-none" />

    <form onSubmit={onSubmit} className="relative z-10 w-full max-w-sm space-y-4 p-7 text-center rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-2xl shadow-[0_25px_80px_rgba(236,72,153,0.25)] rise">
      <div className="relative mx-auto h-16 w-16 drop-shadow-[0_4px_16px_rgba(236,72,153,0.55)]">
        <img src="/logo.png" alt="SyncCinema Logo" className="h-full w-full object-contain" />
      </div>
      <h1 className="font-display text-2xl font-bold text-pink-100 flex items-center justify-center gap-2">
        {icon}
        <span>{title}</span>
      </h1>
      <p className="text-sm text-pink-200/85">{hint}</p>
      {children}
      <button className="btn-pink w-full !py-3 font-bold text-white rounded-2xl shadow-lg shadow-pink-500/30 cursor-pointer">{cta}</button>
      <Link href="/" className="block text-xs text-pink-400 hover:text-pink-200 hover:underline font-medium">Back to home</Link>
    </form>
  </main>
);

const Tool = ({ icon, label, title, onClick, className = '', labelClass = 'hidden lg:inline' }) => (
  <button onClick={onClick} title={title} aria-label={title} className={`ghost ${className}`}>{icon}{label && <span className={labelClass}>{label}</span>}</button>
);

// Dedicated Phone & Tablet Duo Cam Call Deck (protected inside CallErrorBoundary)
function MobileCallTabDeck({
  users,
  me,
  hostId,
  callCam,
  callMic,
  callMedia,
  callControlsRef,
  isGhost,
  handleKickUser,
  copy,
}) {
  const otherUsers = (users || []).filter((u) => u && u.id !== me);

  return (
    <div className="p-3 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pink-500/20 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-xs sm:text-sm text-pink-100">Live Video &amp; Voice Call</span>
          <span className="text-[11px] text-pink-200 font-medium">({(users || []).length} connected)</span>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
            callCam
              ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
              : 'border-pink-500/30 text-pink-200 bg-pink-500/10'
          }`}
        >
          {callCam ? 'Camera Live' : 'Camera Off'}
        </span>
      </div>

      {/* Remote Partners Gallery */}
      {otherUsers.length > 0 ? (
        <div
          className={`grid gap-2.5 ${
            otherUsers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {otherUsers.map((partner) => (
            <div
              key={partner?.id || Math.random()}
              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#222222] border border-pink-500/25 shadow-xl group"
            >
              <Tile
                stream={callMedia?.remote?.[partner?.id]}
                name={partner?.name}
                isPartner={true}
                voiceOnly={callMedia?.voiceOnly}
                isSpeaking={Boolean(callMedia?.remoteTalking?.[partner?.id])}
                isCamOff={Boolean(callMedia?.remoteCamOff?.[partner?.id])}
                isMicMuted={Boolean(callMedia?.remoteMicMuted?.[partner?.id])}
                className="w-full h-full aspect-video !rounded-2xl"
              />
              {me === hostId && partner?.id && (
                <button
                  type="button"
                  onClick={() => handleKickUser?.(partner.id, partner.name)}
                  title={`Kick ${partner.name}`}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#222222]/90 hover:bg-pink-600 text-pink-100 hover:text-white border border-pink-500/30 transition shadow z-20 cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-video w-full rounded-2xl border border-dashed border-pink-500/30 bg-[#1a1a1a]/60 flex flex-col items-center justify-center p-4 text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Heart className="h-5 w-5 animate-pulse text-pink-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-pink-100">Waiting for partner to join call…</p>
            <p className="text-[10px] text-pink-200/70">Share room link or invite code to connect</p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="btn-pink px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg shadow-pink-500/30 cursor-pointer active:scale-95"
          >
            Copy Room Invite 💌
          </button>
        </div>
      )}

      {/* Local User Preview & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#222222]/95 border border-pink-500/20 shadow-lg">
        {/* Local Pip */}
        {!isGhost ? (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="h-12 w-16 sm:h-14 sm:w-20 rounded-xl overflow-hidden bg-[#222222] border border-pink-500/25 shrink-0 shadow-md">
              <Tile
                stream={callMedia?.mine}
                name="You"
                isPartner={false}
                voiceOnly={callMedia?.voiceOnly}
                isSpeaking={Boolean(callMedia?.localTalking)}
                isCamOff={!callCam}
                isMicMuted={!callMic}
                disableFullscreen={true}
                className="w-full h-full !aspect-auto !rounded-xl"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-pink-100 truncate">You (Your Camera)</div>
              <div className="text-[10px] text-pink-200/70">
                {callCam ? 'Hardware streaming' : 'Hardware released'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center sm:text-left py-1">
            <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
              👻 Stealth Mode Active
            </span>
            <span className="text-[10px] text-purple-400/80">0 camera/mic used &bull; 100% invisible</span>
          </div>
        )}

        {/* Action Controls */}
        {!isGhost && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => {
                try {
                  callControlsRef.current?.toggleMic?.();
                } catch (err) {
                  console.warn('toggleMic error:', err);
                }
              }}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                callMic
                  ? 'bg-white/10 hover:bg-white/15 border-white/15 text-pink-100'
                  : 'bg-pink-500/20 border-pink-500/40 text-pink-100 shadow-md shadow-pink-500/20'
              }`}
              title={callMic ? 'Mute microphone' : 'Unmute microphone'}
            >
              {callMic ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-pink-400" />}
              <span>{callMic ? 'Mic: ON' : 'MUTED'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await callControlsRef.current?.toggleCam?.();
                } catch (err) {
                  console.warn('toggleCam error:', err);
                }
              }}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                callCam
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                  : 'bg-pink-500/20 border-pink-500/40 text-pink-100 shadow-md shadow-pink-500/20'
              }`}
              title={callCam ? 'Turn off camera' : 'Turn on camera'}
            >
              {callCam ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4 text-pink-400" />}
              <span>{callCam ? 'Cam: ON' : 'Cam: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  callControlsRef.current?.toggleVoiceOnly?.();
                } catch (err) {
                  console.warn('toggleVoiceOnly error:', err);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                callMedia?.voiceOnly
                  ? 'btn-pink text-white shadow-md shadow-pink-500/30'
                  : 'bg-white/10 border-white/15 text-pink-200/80 hover:text-pink-100'
              }`}
              title="Toggle Voice-Only Mode (saves bandwidth)"
            >
              <Volume2 className="h-4 w-4 text-pink-400" />
              <span className="hidden xs:inline">{callMedia?.voiceOnly ? 'Voice Only' : 'Audio Mode'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const router = useRouter();
  const [name, setName] = useState(null), [draft, setDraft] = useState('');
  const [boot, setBoot] = useState(null), [users, setUsers] = useState([]), [hostId, setHostId] = useState(null);
  const [maxSeats, setMaxSeats] = useState(2);
  const [chat, setChat] = useState([]);
  const [screenBy, setScreenBy] = useState(null), [screen, setScreen] = useState(null);
  const [queue, setQueue] = useState([]), [needKey, setNeedKey] = useState(false), [keyTick, setKeyTick] = useState(0), [keyDraft, setKeyDraft] = useState('');
  const [sleep, setSleep] = useState(0), seen = useRef(new Set());
  const [err, setErr] = useState(''), [lock, setLock] = useState(false), [needPass, setNeedPass] = useState(null), [passDraft, setPassDraft] = useState('');
  const [entryLocked, setEntryLocked] = useState(false), [isGhost, setIsGhost] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false), [newPassDraft, setNewPassDraft] = useState(''), [passVisible, setPassVisible] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false), [capacityDraft, setCapacityDraft] = useState(2);
  const [online, setOnline] = useState(true), [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false), [cinema, setCinema] = useState(false), [toast, setToast] = useState(null), toastT = useRef();
  const [hideWaitingBanner, setHideWaitingBanner] = useState(false);
  
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'call' | 'gestures' | 'extras' | 'tools'
  const [toolsSubTab, setToolsSubTab] = useState('extras'); // 'extras' | 'intimacy'
  const [desktopTab, setDesktopTab] = useState('extras'); // 'extras' | 'gestures' | 'recent' | 'intimacy'
  const [showMenu, setShowMenu] = useState(false);
  const [showCall, setShowCall] = useState(true);
  const [showHandoff, setShowHandoff] = useState(false);
  const callControlsRef = useRef(null);
  const [callCam, setCallCam] = useState(true);
  const [callMic, setCallMic] = useState(true);
  const [callMedia, setCallMedia] = useState({
    mine: null,
    remote: {},
    cam: true,
    mic: true,
    voiceOnly: false,
    localTalking: false,
    remoteTalking: {},
  });

  // Movie-Night Extras & Intimacy State
  const [watchlist, setWatchlist] = useState([]);
  const [timer, setTimer] = useState(null);
  const [readyCheck, setReadyCheck] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [adultMode, setAdultMode] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [ottAccounts, setOttAccounts] = useState({});

  // View Modes & Cinema Plugins State
  const [viewMode, setViewMode] = useState('theater'); // 'theater' | 'duo' | 'party' | 'focus'
  const [showPlugins, setShowPlugins] = useState(false);
  const [pluginsTab, setPluginsTab] = useState('soundscapes');
  const [duoRightTab, setDuoRightTab] = useState('cam'); // 'cam' | 'chat'

  // Room Color Themes & Ambiance State (Sunset Terrace Light Default)
  const [currentThemeId, setCurrentThemeId] = useState('offwhite');
  const [showWallpaper, setShowWallpaper] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Built-in VPN Shield & Network IP Cloak
  const [vpnShield, setVpnShield] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synccinema_vpn_shield') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('sc_room_theme');
      if (savedTheme && savedTheme !== 'obsidian' && ROOM_THEMES[savedTheme]) {
        setCurrentThemeId(savedTheme);
      } else {
        setCurrentThemeId('offwhite');
      }
      const savedWp = localStorage.getItem('sc_show_wallpaper');
      if (savedWp !== null) {
        setShowWallpaper(savedWp === '1');
      } else {
        setShowWallpaper(true);
      }
    } catch {}
  }, []);

  const selectTheme = (themeId, syncWithRoom = false) => {
    if (!ROOM_THEMES[themeId]) return;
    setCurrentThemeId(themeId);
    try { localStorage.setItem('sc_room_theme', themeId); } catch {}
    if (syncWithRoom && socket && me === hostId) {
      socket.emit('ambient:set', { preset: themeId, intensity: 80 });
      say(`Synced "${ROOM_THEMES[themeId].name}" theme to all room members 🎨`);
    } else {
      say(`Ambiance switched to ${ROOM_THEMES[themeId].name} ✨`);
    }
  };

  const theme = ROOM_THEMES[currentThemeId] || ROOM_THEMES.midnight;

  const peerRef = useRef(null), playerRef = useRef(null), root = useRef();
  const socket = typeof window !== 'undefined' ? getSocket() : null;
  const me = typeof window !== 'undefined' ? getCid() : null;

  const say = (m) => { setToast({ m, n: Date.now() }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2400); };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sc_view_mode');
      if (saved && ['theater', 'duo', 'party', 'focus'].includes(saved)) {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('sc_view_mode', mode); } catch {}
    const labels = {
      theater: '🎭 Theater Auditorium Mode',
      duo: '💑 Duo Date Night Mode (Side-by-Side)',
      party: '👥 Watch Party Grid Mode',
      focus: '⚡ Minimalist Focus Mode',
    };
    say(labels[mode] || mode);
  };

  const triggerReaction = (emoji) => {
    if (!socket) return;
    const vt = playerRef.current?.getCurrentTime?.() || 0;
    socket.emit('reaction:timed', { emoji, vt });
    const el = Object.assign(document.createElement('div'), { textContent: emoji });
    el.className = 'absolute bottom-4 text-4xl pointer-events-none select-none z-30';
    el.style.left = 10 + Math.random() * 80 + '%';
    document.getElementById('reaction-layer')?.append(el);
    gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
  };

  const doJoin = (overridePass, overrideKey) => {
    if (!socket || !name) return;

    // Strict Anti-Bot Human Browser Verification
    if (!isRealHumanBrowser()) {
      setErr('bot_detected');
      return;
    }

    const p = overridePass !== undefined
      ? overridePass
      : (sessionStorage.getItem('rp_' + roomId) || localStorage.getItem('rp_' + roomId) || '');
    const isCreate = sessionStorage.getItem('is_create_' + roomId) === '1' || (typeof window !== 'undefined' && window.location.hash.includes('create=1'));
    const k = overrideKey !== undefined ? overrideKey : getKey();
    const maxU = Number(sessionStorage.getItem('max_users_' + roomId) || 2);
    
    // Ghost Mode check (Admin only)
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? (window.location.search || window.location.hash.replace(/^#/, '?')) : '');
    const ghostFlag = isGhost || searchParams.get('ghost') === '1';
    const admKey = searchParams.get('adminKey') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_key') : '') || '';

    socket.emit('join', {
      roomId,
      cid: me,
      name: ghostFlag ? 'Admin Ghost' : name,
      key: k,
      pass: p,
      isCreate,
      maxUsers: maxU,
      isGhost: ghostFlag,
      adminKey: admKey,
      token: sessionStorage.tok || '',
      hp: getHumanProofToken(),
    }, (r) => {
      if (!r) return;
      if (r.error === 'bot_detected') return setErr('bot_detected');
      if (r.error === 'denied') return setNeedKey(true);
      if (['needpass', 'badpass'].includes(r.error)) {
        sessionStorage.removeItem('rp_' + roomId);
        try { localStorage.removeItem('rp_' + roomId); } catch {}
        return setNeedPass(r.error);
      }
      if (r.error === 'room_taken') {
        sessionStorage.removeItem('is_create_' + roomId);
        return setNeedPass('room_taken');
      }
      if (r.error === 'room_locked') {
        return setErr('room_locked');
      }
      if (r.error === 'room_locked_security') {
        return setErr('room_locked_security');
      }
      if (r.error === 'banned_from_room') {
        return setErr('banned_from_room');
      }
      if (r.error === 'full') {
        return setErr('full');
      }
      if (r.error) return setErr(r.error);

      if (r.isGhost) {
        setIsGhost(true);
      }

      sessionStorage.removeItem('is_create_' + roomId);
      setNeedKey(false);
      setNeedPass(null);
      setErr('');
      sessionStorage.tok = r.token;
      if (p) {
        sessionStorage.setItem('rp_' + roomId, p);
        try { localStorage.setItem('rp_' + roomId, p); } catch {}
      }
      if (r.maxUsers) setMaxSeats(r.maxUsers);
      if (r.entryLocked !== undefined) setEntryLocked(!!r.entryLocked);
      setQueue(r.queue || []);
      setWatchlist(r.watchlist || []);
      setTimer(r.timer || null);
      setReadyCheck(r.readyCheck || null);
      setReviews(r.reviews || []);
      setAdultMode(!!r.adult);
      setHasPin(!!r.hasPin);
      try {
        const searchParams = new URLSearchParams(typeof window !== 'undefined' ? (window.location.search || window.location.hash.replace(/^#/, '?')) : '');
        const urlTheme = searchParams.get('theme');
        const savedTheme = localStorage.getItem('sc_room_theme');
        if (urlTheme && ROOM_THEMES[urlTheme]) {
          setCurrentThemeId(urlTheme);
          localStorage.setItem('sc_room_theme', urlTheme);
        } else if (savedTheme && ROOM_THEMES[savedTheme]) {
          setCurrentThemeId(savedTheme);
        } else if (r.ambient?.preset && ROOM_THEMES[r.ambient.preset]) {
          setCurrentThemeId(r.ambient.preset);
        }
      } catch {}
      if (r.ottAccounts) setOttAccounts(r.ottAccounts);
      if (r.media) setCurrentMedia(r.media);
      setLock(r.lock);
      setUsers(r.users || []);
      setHostId(r.hostId);
      setChat(r.chat || []);
      setScreenBy(r.screenBy);
      setBoot(r);
      setOnline(true);

      // High-Precision Real Location & Anti-VPN Geolocation Resolver
      try {
        detectRealLocation()
          .then((realGeo) => {
            if (realGeo && socket.connected) {
              socket.emit('user:geo', realGeo);
            }
          })
          .catch(() => {});
      } catch {}

      const initVid = sessionStorage.getItem('init_video_' + roomId);
      if (initVid && (!r.media || r.media.type === 'none')) {
        sessionStorage.removeItem('init_video_' + roomId);
        socket.emit('media:set', { media: { type: 'auto', src: initVid } });
      }
    });
  };

  useEffect(() => {
    localStorage.lastRoom = roomId;
    setName(localStorage.getItem('name') || '');
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const hashParams = new URLSearchParams(hash);

      // Support production hybrid invite tokens (No plaintext pass or key in URL)
      const inv = searchParams.get('inv') || hashParams.get('inv');
      if (inv) {
        const parsed = parseHybridInvite(inv, roomId);
        if (parsed?.pass) {
          sessionStorage.setItem('rp_' + roomId, parsed.pass);
          try { localStorage.setItem('rp_' + roomId, parsed.pass); } catch {}
        }
        if (parsed?.key) setKey(parsed.key);
      }

      // Small dynamic & legacy invite params
      const p = searchParams.get('p') || searchParams.get('pass') || hashParams.get('p') || hashParams.get('pass');
      const k = searchParams.get('k') || searchParams.get('key') || hashParams.get('k') || hashParams.get('key');
      const v = searchParams.get('video') || hashParams.get('video');
      const createFlag = searchParams.get('create') || hashParams.get('create');
      const maxParam = searchParams.get('max') || hashParams.get('max');
      const ghostParam = searchParams.get('ghost') || hashParams.get('ghost');
      const admKey = searchParams.get('adminKey') || hashParams.get('adminKey');

      if (ghostParam === '1') {
        setIsGhost(true);
        setName((prev) => prev || 'Admin Ghost');
      }
      if (admKey) {
        sessionStorage.setItem('sc_admin_key', admKey);
      }
      if (p) {
        sessionStorage.setItem('rp_' + roomId, p);
        try { localStorage.setItem('rp_' + roomId, p); } catch {}
      }
      if (createFlag === '1') {
        sessionStorage.setItem('is_create_' + roomId, '1');
      }
      if (maxParam && ['2', '3', '4'].includes(maxParam)) {
        sessionStorage.setItem('max_users_' + roomId, maxParam);
        setMaxSeats(Number(maxParam));
      }
      if (k) setKey(k);
      if (v) sessionStorage.setItem('init_video_' + roomId, v);

      // Instantly cleanse browser address bar so tickets, credentials, and hash never linger in URL bar or history
      if (typeof window !== 'undefined' && (window.location.search || window.location.hash)) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }
    } catch {}
  }, [roomId]);

  useEffect(() => () => document.body.classList.remove('cinema', 'hide-screen'), []);
  useEffect(() => { document.body.classList.toggle('hide-screen', hidden); }, [hidden]);

  useEffect(() => {
    if (!name || !socket) return;
    const joinHandler = () => doJoin();
    socket.on('connect', joinHandler);
    socket.on('disconnect', () => setOnline(false));
    socket.on('presence', (p) => {
      p.users.forEach((u) => { if (u.id !== me && !seen.current.has(u.sid)) { seen.current.add(u.sid); hello(u.name); } });
      setUsers(p.users); setHostId(p.hostId); setLock(p.lock);
      if (p.adult !== undefined) setAdultMode(!!p.adult);
      if (p.entryLocked !== undefined) setEntryLocked(!!p.entryLocked);
      if (p.maxUsers) setMaxSeats(p.maxUsers);
    });
    socket.on('room:entry_locked', ({ locked }) => {
      setEntryLocked(!!locked);
    });
    socket.on('kicked', ({ reason } = {}) => {
      setErr(reason || 'You have been removed from this room by the host.');
    });
    socket.on('chat', (m) => setChat((c) => [...c.slice(-99), m]));
    socket.on('chat:cleared', () => setChat([]));
    socket.on('screen', (by) => { setScreenBy(by); if (!by) setScreen(null); });
    socket.on('reaction', (e) => {
      const el = Object.assign(document.createElement('div'), { textContent: e });
      el.className = 'absolute bottom-4 text-4xl pointer-events-none select-none z-30';
      el.style.left = 8 + Math.random() * 80 + '%';
      document.getElementById('reaction-layer')?.append(el);
      gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
    });
    socket.on('reaction:timed', (data) => {
      const el = Object.assign(document.createElement('div'), { textContent: data.emoji });
      el.className = 'absolute bottom-4 text-4xl pointer-events-none select-none z-30';
      el.style.left = 8 + Math.random() * 80 + '%';
      document.getElementById('reaction-layer')?.append(el);
      gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
    });
    if (window.Notification?.permission === 'default') Notification.requestPermission();
    socket.on('queue', setQueue);
    socket.on('watchlist', setWatchlist);
    socket.on('timer:sync', setTimer);
    socket.on('ready:update', setReadyCheck);
    socket.on('ready:all', setReadyCheck);
    socket.on('reviews:update', setReviews);
    socket.on('room:adult_updated', setAdultMode);
    socket.on('room:pass_updated', () => say('Room password was updated 🔒'));
    socket.on('room:closed', (info) => {
      try {
        sessionStorage.removeItem('rp_' + roomId);
        localStorage.removeItem('rp_' + roomId);
      } catch {}
      say(info?.message || info?.reason || 'This room has been closed.');
      setTimeout(() => {
        router.push('/');
      }, 1200);
    });
    socket.on('pin:status', (s) => setHasPin(!!s?.hasPin));
    socket.on('state', (st) => {
      if (st?.media) setCurrentMedia(st.media);
    });
    socket.on('ott:sync', (accounts) => setOttAccounts(accounts || {}));
    socket.on('voice:active', ({ active } = {}) => {
      setVoiceActive(!!active);
    });
    socket.on('ambient:update', (amb) => {
      if (amb?.preset && ROOM_THEMES[amb.preset]) {
        setCurrentThemeId(amb.preset);
        try { localStorage.setItem('sc_room_theme', amb.preset); } catch {}
        say(`Room ambiance changed to ${ROOM_THEMES[amb.preset].name} 🎨`);
      }
    });
    socket.on('nudge', () => {
      navigator.vibrate?.([200, 100, 200]);
      for (let i = 0; i < 14; i++) {
        const el = Object.assign(document.createElement('div'), { textContent: '💗' });
        el.className = 'fixed bottom-10 z-50 text-5xl pointer-events-none'; el.style.left = 10 + Math.random() * 80 + '%';
        document.body.append(el);
        gsap.to(el, { y: -window.innerHeight * 0.8, opacity: 0, scale: 1.6, duration: 2 + Math.random(), delay: i * 0.08, ease: 'power1.out', onComplete: () => el.remove() });
      }
    });

    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', joinHandler);
      socket.off('voice:active');
      socket.off('ott:sync');
      socket.off('ambient:update');
    };
  }, [name, socket]);

  useEffect(() => {
    if (!boot) return;
    let lock; const get = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch {} };
    const vis = () => document.visibilityState === 'visible' && get();
    get(); document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release?.(); };
  }, [!!boot]);

  useEffect(() => {
    if (!sleep) return;
    const t = setTimeout(() => { playerRef.current?.pause?.(); setSleep(0); say('Sleep timer done — movie paused. Sweet dreams 🌙'); }, sleep * 60000);
    return () => clearTimeout(t);
  }, [sleep]);

  // Throttled user activity reporter (reports UI interaction to server to keep active room alive)
  useEffect(() => {
    if (!socket) return;
    let lastSent = 0;
    const reportActivity = () => {
      const now = Date.now();
      if (now - lastSent > 45000) {
        lastSent = now;
        if (socket.connected) {
          socket.emit('user:active');
        }
      }
    };
    window.addEventListener('click', reportActivity, { passive: true });
    window.addEventListener('keydown', reportActivity, { passive: true });
    window.addEventListener('touchstart', reportActivity, { passive: true });
    window.addEventListener('mousemove', reportActivity, { passive: true });
    return () => {
      window.removeEventListener('click', reportActivity);
      window.removeEventListener('keydown', reportActivity);
      window.removeEventListener('touchstart', reportActivity);
      window.removeEventListener('mousemove', reportActivity);
    };
  }, [socket]);

  // Periodic and on-focus real location update (picks up GPS permission approval / network changes)
  useEffect(() => {
    if (!boot || !socket) return;
    const syncRealGeo = () => {
      try {
        detectRealLocation()
          .then((realGeo) => {
            if (realGeo && socket.connected) {
              socket.emit('user:geo', realGeo);
            }
          })
          .catch(() => {});
      } catch {}
    };

    const timer = setTimeout(syncRealGeo, 2000);
    const interval = setInterval(syncRealGeo, 20000);
    window.addEventListener('focus', syncRealGeo);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('focus', syncRealGeo);
    };
  }, [!!boot, socket]);

  useEffect(() => {
    if (!boot) return;
    const ctx = gsap.context(() => {
      gsap.from('.hdr > *', { opacity: 0, y: -16, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
      gsap.from('.panel', { opacity: 0, y: 28, duration: 0.8, stagger: 0.15, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, [!!boot]);

  const copy = async () => {
    const rp = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let inviteUrl = getSmallInviteUrl(origin, roomId, rp);

    // Dynamic short link (/j/<code>)
    try {
      const dyn = await fetchDynamicShortInvite(roomId, rp, getKey());
      if (dyn?.shortUrl) inviteUrl = dyn.shortUrl;
    } catch {}

    // 1. Try native Web Share on mobile (WhatsApp, Telegram, SMS, etc.)
    if (typeof navigator !== 'undefined' && navigator.share && /android|iphone|ipad|mobile/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `Join my SyncCinema room "${roomId}"`,
          text: `🍿 Watch together in sync on SyncCinema!\nRoom: ${roomId}${rp ? `\nPassword: ${rp}` : ''}\n\nTap to enter room:\n`,
          url: inviteUrl,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        say('Invite shared with partner! 💌');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User simply closed the share sheet
      }
    }

    // 2. Clipboard copy fallback
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        throw new Error('Fallback required');
      }
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = inviteUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    say('Small invite link copied! Share with your partner 💌✨');
  };
  const cycleSleep = () => { const n = { 0: 15, 15: 30, 30: 60, 60: 0 }[sleep]; setSleep(n); say(n ? `Movie will pause in ${n} min 🌙` : 'Sleep timer off'); };
  const toggleCinema = () => {
    setCinema((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next) document.body.classList.add('cinema');
        else document.body.classList.remove('cinema');
      }
      say(next ? 'Cinema Mode: Screen Illuminated (All UI Faded) 🎬' : 'Cinema Mode Off ☀️');
      return next;
    });
  };
  const toggleHide = () => { setHidden((h) => { say(!h ? 'Screen hidden — hover or tap to peek' : 'Screen visible'); return !h; }); };
  const handleKickUser = (targetCid, targetName) => {
    if (me !== hostId) return;
    if (confirm(`Remove and ban "${targetName}" from this private cinema room?`)) {
      socket.emit('room:kick_user', { targetCid, reason: 'Removed by host' }, (res) => {
        if (res?.ok) {
          say(`Removed ${targetName} from the room 🛡️`);
        } else {
          say(res?.message || 'Could not kick user');
        }
      });
    }
  };

  if (name === null) return null;
  if (!name) return (
    <Gate icon={<User className="h-6 w-6" />} title="What should we call you?" hint="Your partner will see this name." cta="Join the couch"
      onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { localStorage.setItem('name', draft.trim()); setName(draft.trim()); } }}>
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your name" className="field text-center" />
    </Gate>
  );


  if (needPass) return (
    <Gate icon={<Lock className="h-6 w-6 text-pink-400" />} cta="Unlock & Enter Room 🍿"
      title="Room Password Required"
      hint={
        needPass === 'badpass'
          ? 'Wrong room password. Please verify with the host and try again.'
          : needPass === 'room_taken'
          ? 'A room with this name is already active. Enter its password to join.'
          : 'This cinema room is strictly protected with a password. No one can enter without it.'
      }
      onSubmit={(e) => {
        e.preventDefault();
        const v = passDraft.trim();
        if (!v || v.length < 4) return;
        sessionStorage.setItem('rp_' + roomId, v);
        try { localStorage.setItem('rp_' + roomId, v); } catch {}
        setNeedPass(null);
        setPassDraft('');
        doJoin(v);
      }}
    >
      <div className="space-y-2">
        <input 
          autoFocus 
          type="password" 
          minLength={4} 
          maxLength={64} 
          value={passDraft} 
          onChange={(e) => setPassDraft(e.target.value)} 
          placeholder="Enter room password (min 4 characters)" 
          className="field text-center font-mono !py-3 w-full" 
          required 
        />
        <p className="text-[11px] text-pink-200/90">
          Enter the password shared by the room host.
        </p>
      </div>
    </Gate>
  );

  if (err) return (
    <Gate
      icon={<Lock className="h-6 w-6 text-pink-400" />}
      cta="Back to Home"
      title={
        err === 'bot_detected'
          ? 'Bot Access Prohibited'
          : err === 'room_locked'
          ? 'Room Locked by Host'
          : err === 'room_locked_security'
          ? 'Room Temporarily Protected'
          : err === 'banned_from_room'
          ? 'Removed from Room'
          : err === 'full'
          ? 'Room is Full'
          : 'Cannot Enter Room'
      }
      hint={
        err === 'bot_detected'
          ? 'Automated scripts, scrapers, and headless tools are strictly forbidden from entering SynCinema rooms. Please use a standard human web browser.'
          : err === 'room_locked'
          ? 'The host has locked this room. No new members are currently allowed to enter.'
          : err === 'room_locked_security'
          ? 'This room was temporarily locked due to repeated incorrect password attempts to protect privacy.'
          : err === 'banned_from_room'
          ? 'You have been removed from this private session by the room host.'
          : err === 'full'
          ? `This room has reached its maximum capacity (${maxSeats} members).`
          : String(err)
      }
      onSubmit={(e) => {
        e.preventDefault();
        window.location.href = '/';
      }}
    >
      <div className="text-center py-2 text-xs text-white/50">
        {err === 'bot_detected'
          ? 'Human verification shield active. Automated connections are blocked.'
          : err === 'room_locked_security'
          ? 'Please verify the room password with the host and try again later.'
          : err === 'room_locked'
          ? 'Only existing members can rejoin.'
          : 'Please return to the lobby or join another cinema room.'}
      </div>
    </Gate>
  );



  return (
    <div ref={root} className={`min-h-screen min-h-[100dvh] w-full max-w-[1920px] mx-auto flex flex-col ${cinema ? '!bg-black' : theme.bgClass} ${theme.isLight && !cinema ? 'text-zinc-900' : 'text-pink-100'} font-sans selection:bg-pink-500 selection:text-white antialiased overflow-x-hidden overflow-y-auto relative transition-colors duration-500`}>
      {/* Dynamic Ambient Cinema Background */}
      {showWallpaper && (
        <div 
          className={`fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700 ${cinema ? 'opacity-0' : theme.isLight ? 'opacity-90' : 'opacity-60'}`}
          style={{ 
            backgroundImage: `url('${theme.wallpaper || (theme.isLight ? '/sunset-cinema-bg.jpg?v=couple2' : '/home-bg.jpg')}')`,
            backgroundPosition: 'center center',
          }}
        />
      )}

      {/* Theme Vignette Gradient Overlay */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-700 ${theme.overlayGradient} ${cinema ? 'opacity-0' : 'opacity-100'}`} />

      {/* Soft Ambient Glow Lighting Orb */}
      <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[350px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 ${theme.ambientGlow} ${cinema ? 'opacity-0' : 'opacity-100'}`} />

      {/* 🎬 Floating Exit Cinema Lights Pill (Appears when Cinema Mode is active) */}
      {cinema && (
        <button
          type="button"
          onClick={toggleCinema}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/90 hover:bg-black text-white/90 hover:text-white border border-pink-500/50 shadow-2xl text-xs font-bold transition hover:scale-105 cursor-pointer animate-pulse"
          title="Exit Cinema Lights and restore room controls"
        >
          <Film className="h-4 w-4 text-pink-400" />
          <span>Exit Cinema Lights ✕</span>
        </button>
      )}

      {/* 👻 Stealth Aurelia Ghost Monitor Banner */}
      {isGhost && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#222222]/95 border border-purple-500/40 px-4 py-1.5 text-xs font-semibold text-purple-200 backdrop-blur-xl flex items-center gap-2 pointer-events-none">
          <span className="text-base">👻</span>
          <span>Aurelia Stealth Monitor Active (Invisible to Host &amp; Members)</span>
        </div>
      )}

      {/* Responsive Top Header (100% Notch-Free, Safe Hardware Cutout Area) */}
      {/* Modern De-Cluttered Unified Cinema Navbar */}
      <header className={`hdr shrink-0 safe-top-notch min-h-14 sm:min-h-16 h-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-2 border-b ${theme.navBg} backdrop-blur-xl z-20 transition-all duration-500 ${cinema ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {/* Left: Brand + Interactive Capacity Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
          <BrandLogo size="sm" href="/" hideTextOnMobile={true} isLight={theme.isLight} />
          
          {/* Interactive Room Capacity & Live Pill */}
          <button
            type="button"
            onClick={() => {
              if (me === hostId) {
                setCapacityDraft(maxSeats);
                setShowCapacityModal(true);
              } else {
                say(`Room Capacity: ${users.length} of ${maxSeats} members (Host can increase up to 30)`);
              }
            }}
            className={`hover-lift inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs font-semibold border transition shrink-0 ${
              theme.isLight
                ? me === hostId
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200/90 text-slate-800 cursor-pointer active:scale-95 shadow-sm'
                  : 'bg-slate-100 border-slate-200/80 text-slate-700 cursor-default'
                : me === hostId
                  ? 'bg-white/10 hover:bg-rose-500/20 border-white/15 hover:border-rose-500/40 text-white cursor-pointer active:scale-95 shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/80 cursor-default'
            }`}
            title={me === hostId ? `Capacity: ${users.length}/${maxSeats} members. Click to change (2 to 30 seats)` : `Capacity: ${users.length}/${maxSeats} members`}
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <Users className="h-3 w-3 text-pink-500 shrink-0" />
            <span className="font-mono">{users.length}/{maxSeats}</span>
            {me === hostId && <span className={`text-[10px] hidden xs:inline ${theme.isLight ? 'text-slate-500' : 'text-white/60'}`}>⚙️</span>}
          </button>

          {entryLocked && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-300 font-semibold" title="Host locked this room from new entries">
              <Lock className="h-3 w-3" />
              <span className="hidden md:inline">Locked</span>
            </span>
          )}
        </div>

        {/* Center: Sleek View Modes Capsule (Desktop) */}
        <div className={`hidden lg:flex items-center gap-0.5 p-1 rounded-2xl border shadow-sm ${
          theme.isLight ? 'bg-white/70 border-slate-200/80 backdrop-blur-md' : 'bg-black/30 border-white/10 backdrop-blur-md'
        }`}>
          {[
            { id: 'theater', label: 'Theater', icon: <MonitorPlay className="h-3.5 w-3.5" /> },
            { id: 'duo', label: 'Duo Date', icon: <Heart className="h-3.5 w-3.5" /> },
            { id: 'party', label: 'Party Grid', icon: <Users className="h-3.5 w-3.5" /> },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changeViewMode(m.id)}
              className={`hover-lift h-7 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === m.id
                  ? 'btn-pink text-white shadow-sm'
                  : theme.isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Switch to ${m.label} Mode`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Streamlined Action Controls (De-Cluttered for Clean Mobile & Desktop Layout) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 py-0.5">
          {/* Active Snack Break Indicator */}
          {timer?.running && (
            <button
              type="button"
              onClick={() => { setShowPlugins(true); setPluginsTab('intermission'); }}
              className="anim-float flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-mono hover:bg-emerald-500/30 shrink-0"
              title="Synchronized snack break in progress (Click to view)"
            >
              <Timer className="h-3 w-3" />
              <span>🍿 {Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) / 60)}:{(Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) % 60) + '').padStart(2, '0')}</span>
            </button>
          )}

          {/* Quick AV Capsule: Cam & Mic Toggles (Compact, Clean, Touch-friendly) */}
          {!isGhost && (
            <div className={`flex items-center gap-0.5 p-0.5 rounded-xl shrink-0 border shadow-sm ${
              theme.isLight ? 'bg-white/80 border-slate-200/90' : 'bg-black/30 border-white/10'
            }`}>
              <button
                type="button"
                onClick={async () => {
                  try { await callControlsRef.current?.toggleCam?.(); } catch (err) { console.warn('toggleCam error:', err); }
                }}
                className={`hover-lift h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  callCam
                    ? theme.isLight
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300/80'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                }`}
                title={callCam ? 'Camera is ON (Tap to turn OFF)' : 'Camera is OFF (Tap to turn ON)'}
              >
                {callCam ? <Video className="h-3.5 w-3.5 text-emerald-500" /> : <VideoOff className="h-3.5 w-3.5 text-rose-500" />}
                <span className="hidden sm:inline">{callCam ? 'Cam' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => callControlsRef.current?.toggleMic?.()}
                className={`hover-lift h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  callMic
                    ? theme.isLight
                      ? 'bg-sky-500/15 text-sky-800 border border-sky-300/80'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}
                title={callMic ? 'Mic Live (Tap to Mute)' : 'Mic Muted (Tap to Unmute)'}
              >
                {callMic ? <Mic className="h-3.5 w-3.5 text-sky-500" /> : <MicOff className="h-3.5 w-3.5 text-amber-500" />}
                <span className="hidden sm:inline">{callMic ? 'Mic' : 'Muted'}</span>
              </button>
            </div>
          )}

          {/* Quick Invite Button */}
          <button
            onClick={copy}
            className={`hover-lift hover-sheen h-7 sm:h-8 !py-0 px-2.5 sm:px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 border ${
              theme.isLight
                ? 'border-pink-300 bg-white/90 hover:bg-pink-50 text-pink-600 shadow-sm'
                : 'btn-pink text-white shadow-md shadow-pink-500/20'
            }`}
            title="Copy room invite link"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Room Themes Launcher (Desktop Only to save mobile space) */}
          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            className={`hidden md:flex hover-lift h-8 px-2.5 rounded-xl text-xs font-semibold items-center justify-center gap-1.5 border transition cursor-pointer shrink-0 ${theme.themeBtnClass}`}
            title="Change Room Color Theme & Ambiance"
          >
            <Palette className="h-3.5 w-3.5 text-pink-500" />
            <span className="hidden lg:inline">Themes</span>
          </button>

          {/* Cinema Plugins Suite Launcher (Desktop Only) */}
          <button
            type="button"
            onClick={() => setShowPlugins(true)}
            className={`hidden xl:flex hover-lift h-8 px-2.5 rounded-xl text-xs font-bold items-center justify-center gap-1.5 border transition shadow-sm cursor-pointer shrink-0 ${
              theme.isLight
                ? 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-pink-200'
            }`}
            title="Open Cinema Plugins (Atmosphere, Keepsakes, Trivia & Intermission)"
          >
            <Sparkles className="h-3.5 w-3.5 text-pink-500" />
            <span>Plugins</span>
          </button>

          {/* Unified Room Controls, Layouts & Settings Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className={`hover-lift h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer shrink-0 shadow-sm ${
              theme.isLight
                ? 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90'
            }`}
            title="Room Controls, Layouts & Settings"
          >
            <Sliders className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Centered, Modern Room Controls & Settings Modal (Theme-responsive, no clipping) */}
      {showMenu && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className={`card w-full max-w-lg p-5 sm:p-6 space-y-5 rounded-3xl backdrop-blur-2xl shadow-2xl rise my-auto transition-all ${
            theme.isLight
              ? 'bg-white/98 border-2 border-rose-200/90 shadow-[0_20px_60px_rgba(244,63,94,0.12)] text-slate-900'
              : 'bg-[#222222] border border-pink-500/25 shadow-pink-500/10 text-pink-100'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3 ${theme.isLight ? 'border-rose-100' : 'border-pink-500/15'}`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Sliders className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-base sm:text-lg ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Room Controls &amp; Settings</h3>
                  <p className={`text-[11px] font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/70'}`}>Manage security, capacity, sync mode &amp; viewing options</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                  theme.isLight
                    ? 'bg-rose-50 hover:bg-rose-100 text-slate-700 hover:text-slate-950 border border-rose-200'
                    : 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 hover:text-white'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className={`p-2.5 rounded-2xl ${theme.isLight ? 'bg-rose-50/70 border-2 border-rose-200/80 shadow-xs' : 'bg-[#1a1a1d] border border-pink-500/20'}`}>
                <span className={`text-[10px] block font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Room ID:</span>
                <span className={`font-mono font-bold truncate block ${theme.isLight ? 'text-rose-700' : 'text-pink-300'}`}>{roomId}</span>
              </div>
              <div className={`p-2.5 rounded-2xl ${theme.isLight ? 'bg-rose-50/70 border-2 border-rose-200/80 shadow-xs' : 'bg-[#1a1a1d] border border-pink-500/20'}`}>
                <span className={`text-[10px] block font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Capacity:</span>
                <span className={`font-bold block ${theme.isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{users.length} / {maxSeats} Members</span>
              </div>
              <div className={`p-2.5 rounded-2xl col-span-2 sm:col-span-1 ${theme.isLight ? 'bg-rose-50/70 border-2 border-rose-200/80 shadow-xs' : 'bg-[#1a1a1d] border border-pink-500/20'}`}>
                <span className={`text-[10px] block font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Sync Mode:</span>
                <span className={`font-bold block ${theme.isLight ? 'text-rose-600' : 'text-pink-400'}`}>{lock ? '🔒 Host Sync' : '🔓 Free Sync'}</span>
              </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Viewing Layout Switcher */}
              <div className={`col-span-1 sm:col-span-2 p-3 rounded-2xl space-y-2 ${
                theme.isLight ? 'bg-rose-50/60 border-2 border-rose-200/80 shadow-xs' : 'bg-[#1a1a1d] border border-pink-500/20'
              }`}>
                <div className={`text-xs font-bold flex items-center justify-between ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                  <div className="flex items-center gap-1.5">
                    <MonitorPlay className={`h-4 w-4 ${theme.isLight ? 'text-rose-600' : 'text-pink-400'}`} />
                    <span>Cinema View Layout</span>
                  </div>
                  <span className={`text-[10px] font-normal ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Active: {viewMode.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'theater', label: 'Theater', icon: <MonitorPlay className="h-3.5 w-3.5" /> },
                    { id: 'duo', label: 'Duo Date', icon: <Heart className="h-3.5 w-3.5" /> },
                    { id: 'party', label: 'Party Grid', icon: <Users className="h-3.5 w-3.5" /> },
                    { id: 'focus', label: 'Focus Mode', icon: <Eye className="h-3.5 w-3.5" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        changeViewMode(m.id);
                        setShowMenu(false);
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer hover-lift ${
                        viewMode === m.id
                          ? 'btn-pink text-white shadow-md shadow-pink-500/30'
                          : theme.isLight
                            ? 'bg-white hover:bg-rose-100/80 text-slate-700 hover:text-slate-950 border border-rose-200/90'
                            : 'bg-white/5 hover:bg-white/10 text-pink-200/80'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cinema Plugins Suite */}
              <button
                type="button"
                onClick={() => {
                  setShowPlugins(true);
                  setShowMenu(false);
                }}
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                    : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl group-hover:scale-105 transition ${
                  theme.isLight
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                }`}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold flex items-center gap-1.5 ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                    <span>Cinema Plugins</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-300 font-mono font-bold">NEW</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Atmosphere, trivia, intermission &amp; soundscapes</div>
                </div>
              </button>

              {/* Download Android App (APK) */}
              <a
                href="/syncinema.apk"
                download="SyncCinema.apk"
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'bg-white hover:bg-emerald-50/60 border-2 border-rose-200/80 hover:border-emerald-300 shadow-xs'
                    : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold flex items-center gap-1.5 ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                    <span>Android APK</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold">v1.2</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Install lightweight native phone app</div>
                </div>
              </a>

              {/* Video Call Window Visibility */}
              <button
                type="button"
                onClick={() => {
                  setShowCall(!showCall);
                  say(showCall ? 'Video call window hidden' : 'Video call window shown');
                }}
                className={`p-3 rounded-2xl border-2 text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift shadow-xs ${
                  showCall
                    ? theme.isLight
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                    : theme.isLight
                      ? 'bg-white hover:bg-rose-50 border-rose-200/80 hover:border-rose-300'
                      : 'bg-[#1a1a1d] hover:bg-[#252528] border-pink-500/20'
                }`}
              >
                <div className={`p-2 rounded-xl border ${
                  showCall
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : theme.isLight
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                }`}>
                  {showCall ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>{showCall ? 'Video Call Active' : 'Video Call Hidden'}</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Toggle live camera video call overlay</div>
                </div>
              </button>

              {/* Room Password */}
              <button
                type="button"
                onClick={() => {
                  const current = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
                  setNewPassDraft(current);
                  setShowPassModal(true);
                  setShowMenu(false);
                }}
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                    : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl group-hover:scale-105 transition ${
                  theme.isLight
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                }`}>
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Room Password</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>View or edit passcode</div>
                </div>
              </button>

              {/* Ambiance Themes & Colors */}
              <button
                type="button"
                onClick={() => {
                  setShowThemeModal(true);
                  setShowMenu(false);
                }}
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                    : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl group-hover:scale-105 transition ${
                  theme.isLight
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                }`}>
                  <Palette className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Ambiance &amp; Themes</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Switch room colors &amp; vibe</div>
                </div>
              </button>

              {/* Host: Capacity Manager */}
              {me === hostId ? (
                <button
                  type="button"
                  onClick={() => {
                    setCapacityDraft(maxSeats);
                    setShowCapacityModal(true);
                    setShowMenu(false);
                  }}
                  className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                    theme.isLight
                      ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                      : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                  }`}
                >
                  <div className={`p-2 rounded-xl group-hover:scale-105 transition ${
                    theme.isLight
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                  }`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Room Capacity</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Expand up to 30 seats</div>
                  </div>
                </button>
              ) : (
                <div className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 opacity-60 ${
                  theme.isLight
                    ? 'bg-rose-50/30 border-rose-200/50'
                    : 'bg-[#1a1a1d]/40 border-pink-500/10'
                }`}>
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`font-bold ${theme.isLight ? 'text-slate-700' : 'text-pink-200/50'}`}>Room Capacity</div>
                    <div className={`text-[10px] mt-0.5 ${theme.isLight ? 'text-slate-500' : 'text-pink-300/40'}`}>{maxSeats} seats (Host only)</div>
                  </div>
                </div>
              )}

              {/* Host: Lock Entry */}
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => {
                    socket.emit('room:toggle_entry_lock', { locked: !entryLocked }, (res) => {
                      if (res?.ok) setEntryLocked(res.entryLocked);
                    });
                  }}
                  className={`p-3 rounded-2xl border-2 text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift shadow-xs ${
                    entryLocked
                      ? theme.isLight
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-pink-500/15 border-pink-500/40 text-pink-200'
                      : theme.isLight
                        ? 'bg-white hover:bg-rose-50 border-rose-200/80 hover:border-rose-300'
                        : 'bg-[#1a1a1d] hover:bg-[#252528] border-pink-500/20 hover:border-pink-500/40'
                  }`}
                >
                  <div className={`p-2 rounded-xl border ${
                    entryLocked
                      ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                      : theme.isLight
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-[#1a1a1d] text-pink-300 border-pink-500/20'
                  }`}>
                    {entryLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>{entryLocked ? 'Entry Locked' : 'Entry Open'}</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>{entryLocked ? 'Click to allow joins' : 'Click to lock joins'}</div>
                  </div>
                </button>
              )}

              {/* Host: Sync Mode */}
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => socket.emit('lock', !lock)}
                  className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                    theme.isLight
                      ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                      : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                  }`}
                >
                  <div className={`p-2 rounded-xl border ${
                    lock
                      ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}>
                    {lock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>{lock ? 'Host-Only Control' : 'Everyone Control'}</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Toggle seek &amp; pause lock</div>
                  </div>
                </button>
              )}

              {/* Mobile QR Handoff */}
              <button
                type="button"
                onClick={() => {
                  setShowHandoff(true);
                  setShowMenu(false);
                }}
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                    : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl group-hover:scale-105 transition ${
                  theme.isLight
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                }`}>
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>QR Phone Handoff</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Scan to move to phone</div>
                </div>
              </button>

              {/* Sleep Timer */}
              <button
                type="button"
                onClick={cycleSleep}
                className={`p-3 rounded-2xl border-2 text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift shadow-xs ${
                  sleep
                    ? theme.isLight
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-pink-500/15 border-pink-500/40 text-pink-200'
                    : theme.isLight
                      ? 'bg-white hover:bg-rose-50 border-rose-200/80 hover:border-rose-300'
                      : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl border ${
                  sleep
                    ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                    : theme.isLight
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-[#1a1a1d] text-pink-300 border-pink-500/20'
                }`}>
                  <Moon className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>{sleep ? `Sleep in ${sleep}m` : 'Sleep Timer'}</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Auto-pause movie timer</div>
                </div>
              </button>

              {/* Full Screen Mode */}
              <button
                type="button"
                onClick={() => {
                  playerRef.current?.toggleFullscreen?.();
                  setShowMenu(false);
                }}
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift shadow-xs ${
                  theme.isLight
                    ? 'bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 hover:from-rose-100 hover:to-pink-100 border-2 border-rose-300'
                    : 'bg-gradient-to-r from-pink-600/15 to-rose-600/15 hover:from-pink-600/25 hover:to-rose-600/25 border border-pink-500/30 hover:border-pink-400'
                }`}
              >
                <div className={`p-2 rounded-xl border group-hover:scale-105 transition ${
                  theme.isLight
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                }`}>
                  <Maximize2 className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Full Screen Cinema</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/80'}`}>Theater with movable video call</div>
                </div>
              </button>

              {/* Cinema Lights Mode */}
              <button
                type="button"
                onClick={toggleCinema}
                className={`p-3 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200/80 hover:border-rose-300 shadow-xs'
                    : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl group-hover:scale-105 transition ${
                  theme.isLight
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                }`}>
                  <Film className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Cinema Lights</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Dim background lights</div>
                </div>
              </button>

              {/* Hide Screen */}
              <button
                type="button"
                onClick={toggleHide}
                className={`p-3 rounded-2xl border-2 text-left flex items-start gap-2.5 transition group cursor-pointer hover-lift shadow-xs ${
                  hidden
                    ? theme.isLight
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-pink-500/15 border-pink-500/40 text-pink-200'
                    : theme.isLight
                      ? 'bg-white hover:bg-rose-50 border-rose-200/80 hover:border-rose-300'
                      : 'bg-[#1a1a1d] hover:bg-[#252528] border border-pink-500/20 hover:border-pink-500/40'
                }`}
              >
                <div className={`p-2 rounded-xl border ${
                  hidden
                    ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                    : theme.isLight
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-[#1a1a1d] text-pink-300 border-pink-500/20'
                }`}>
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </div>
                <div>
                  <div className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>{hidden ? 'Screen Hidden' : 'Hide Screen'}</div>
                  <div className={`text-[10px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/60'}`}>Quick boss-key toggle</div>
                </div>
              </button>

              {/* Built-in VPN Shield & Network IP Cloak */}
              <div className={`col-span-1 sm:col-span-2 p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                vpnShield
                  ? theme.isLight
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : theme.isLight
                    ? 'bg-white border-rose-200/80 text-slate-800'
                    : 'bg-[#1a1a1d] border-pink-500/20 text-pink-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    vpnShield
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                      : theme.isLight
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-white/5 text-white/50 border-white/10'
                  }`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                        Built-in VPN Shield &amp; IP Cloak
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        vpnShield
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {vpnShield ? 'Active • Bypassing Blocks' : 'Disabled'}
                      </span>
                    </div>
                    <div className={`text-[11px] mt-0.5 font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/70'}`}>
                      Bypasses college Wi-Fi restrictions, ISP firewalls, and hides your IP address
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !vpnShield;
                    setVpnShield(next);
                    if (typeof window !== 'undefined') localStorage.setItem('synccinema_vpn_shield', next ? 'true' : 'false');
                    say(next ? '🛡️ VPN Shield Activated: Network IP Cloaked' : 'VPN Shield Disabled');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shrink-0 ${
                    vpnShield
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  }`}
                >
                  {vpnShield ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>

            {/* Room Footer Actions: Leave Room & Host Close Room */}
            <div className={`pt-2 border-t flex items-center gap-2 ${theme.isLight ? 'border-rose-100' : 'border-pink-500/15'}`}>
              <Link
                href="/"
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition cursor-pointer hover-lift ${
                  theme.isLight
                    ? 'text-slate-800 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 shadow-xs'
                    : 'text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <LogOut className={`h-4 w-4 ${theme.isLight ? 'text-slate-600' : 'text-zinc-400'}`} />
                <span>Leave Room</span>
              </Link>
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to CLOSE this room? All members will be disconnected and this room will be permanently closed.')) {
                      socket.emit('room:close', {}, (res) => {
                        if (res?.ok) {
                          say('Room closed 🚪');
                          try {
                            sessionStorage.removeItem('rp_' + roomId);
                            localStorage.removeItem('rp_' + roomId);
                          } catch {}
                          router.push('/');
                        } else {
                          say(res?.message || 'Failed to close room');
                        }
                      });
                    }
                    setShowMenu(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition cursor-pointer hover-lift ${
                    theme.isLight
                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 shadow-xs'
                      : 'text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                >
                  <DoorClosed className="h-4 w-4 text-rose-500" />
                  <span>Close Room</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {err && <p className="card rise p-6 text-center">{{ full: 'This room is full.', locked: 'Too many wrong tries. Try again in 15 minutes.', taken: 'This seat is already in use.' }[err] || 'Could not join this room.'}</p>}
      
      {!boot && !err && (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[50vh]">
          <div className="relative grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-600 shadow-2xl shadow-pink-950/80 animate-pulse">
            <Film className="h-8 w-8 text-white animate-spin [animation-duration:3s]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-white tracking-wide">Connecting to Private Cinema Room</h3>
            <p className="text-xs text-pink-300/80">Securing zero-latency sync tunnel &amp; encrypted media stream...</p>
          </div>
        </div>
      )}

      {boot && (
        <div className="flex-1 w-full flex flex-col lg:flex-row p-2 sm:p-4 gap-3 sm:gap-4 min-h-0">
          {/* Main Cinema Auditorium (Left / Center) */}
          <section className="flex-1 flex flex-col min-w-0 space-y-3 pb-24 lg:pb-12">
            {users.length < maxSeats && !hideWaitingBanner && (
              <div className={`anim-reveal flex items-center justify-between gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl w-full text-xs shadow-sm backdrop-blur-xl transition-all duration-300 ${
                theme.isLight
                  ? 'bg-white/95 border-2 border-rose-200/90 shadow-[0_8px_30px_rgba(244,63,94,0.06)] text-slate-900'
                  : 'bg-[#1a1a1d]/90 border border-pink-500/25 text-pink-100'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 anim-pulse-glow ${theme.isLight ? 'bg-rose-100 text-rose-600' : 'bg-pink-500/20 text-pink-400'}`}>
                    <Heart className="h-3.5 w-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-xs truncate ${theme.isLight ? 'text-slate-900 font-extrabold' : 'text-white'}`}>
                      Waiting for your partner to join...
                    </div>
                    <div className={`text-[11px] truncate hidden sm:block ${theme.isLight ? 'text-slate-600 font-medium' : 'text-pink-300/70'}`}>
                      Share your room invite link or code to start watching in sync.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={copy}
                    className="btn-pink hover-lift hover-sheen !py-1.5 !px-3 text-xs font-bold flex items-center gap-1 rounded-xl text-white shadow-sm cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Invite'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideWaitingBanner(true)}
                    className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition cursor-pointer"
                    title="Dismiss banner"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Video Player Container */}
            <div className={`w-full rounded-2xl overflow-hidden shadow-2xl transition-colors duration-500 ${
              theme.isLight
                ? 'bg-white/98 border-2 border-rose-200/90 shadow-[0_16px_50px_rgba(244,63,94,0.10)] ring-1 ring-rose-400/20 backdrop-blur-2xl'
                : `bg-[#222222] border ${theme.borderColor}`
            }`}>
              <VideoPlayer
                socket={socket}
                me={me}
                hostId={hostId}
                users={users}
                peerRef={peerRef}
                initial={boot}
                screenBy={screenBy}
                screenStream={screen}
                playerRef={playerRef}
                voiceActive={voiceActive}
                adultMode={adultMode}
                callMedia={callMedia}
                callControlsRef={callControlsRef}
                onOpenRecent={() => { setMobileTab('recent'); setDesktopTab('recent'); }}
                ottAccounts={ottAccounts}
                isGhost={isGhost}
                theme={theme}
              />
            </div>

            {/* Quick Synchronized Floating Reaction Bar */}
            <div className={`my-1 flex items-center justify-between gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-2xl ${
              theme.isLight
                ? 'bg-white/95 border-2 border-rose-200/90 shadow-[0_8px_30px_rgba(244,63,94,0.08)]'
                : `${theme.navBg} border ${theme.borderColor}`
            } backdrop-blur-xl shadow-lg transition-all duration-500 overflow-x-auto no-scrollbar ${cinema ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden xs:inline shrink-0 mr-1 ${theme.isLight ? 'text-slate-700 font-extrabold' : 'text-slate-400'}`}>
                  Reactions:
                </span>
                {[
                  { emoji: '❤️', label: 'Love' },
                  { emoji: '🍿', label: 'Popcorn' },
                  { emoji: '😂', label: 'Laugh' },
                  { emoji: '🔥', label: 'Hype' },
                  { emoji: '👏', label: 'Applause' },
                  { emoji: '🥂', label: 'Cheers' },
                  { emoji: '😭', label: 'Tears' },
                  { emoji: '🚀', label: 'Mindblown' },
                ].map((rx) => (
                  <button
                    key={rx.emoji}
                    type="button"
                    onClick={() => triggerReaction(rx.emoji)}
                    className={`px-2.5 py-1 rounded-xl transition active:scale-125 cursor-pointer shrink-0 flex items-center gap-1 shadow-sm ${
                      theme.isLight
                        ? 'bg-rose-50/80 hover:bg-rose-100 border border-rose-200 text-slate-900 font-semibold shadow-sm'
                        : 'bg-[#222222]/90 hover:bg-pink-600/25 border border-pink-500/20 text-pink-100'
                    }`}
                    title={`Send ${rx.label} reaction to room`}
                  >
                    <span>{rx.emoji}</span>
                    <span className={`text-[10px] hidden sm:inline font-bold ${theme.isLight ? 'text-slate-700' : 'text-pink-200/80'}`}>{rx.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {/* View UI Mode Selector Pill */}
                <div className={`hidden sm:flex items-center gap-0.5 p-0.5 rounded-xl border ${
                  theme.isLight ? 'bg-white border-2 border-rose-200/90 shadow-sm' : 'bg-[#0d0e24] border-slate-800'
                }`}>
                  {[
                    { id: 'theater', label: 'Theater' },
                    { id: 'duo', label: 'Duo' },
                    { id: 'party', label: 'Party' },
                    { id: 'focus', label: 'Focus' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => changeViewMode(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        viewMode === m.id
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                          : theme.isLight
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Quick Themes Launcher Button */}
                <button
                  type="button"
                  onClick={() => setShowThemeModal(true)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-sm ${theme.themeBtnClass}`}
                  title="Change Room Color Theme & Ambiance"
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold hidden sm:inline">{theme.name}</span>
                </button>

                {/* Quick Plugins Button inside Reaction Ribbon */}
                <button
                  type="button"
                  onClick={() => setShowPlugins(true)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    theme.isLight
                      ? 'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 shadow-sm font-semibold'
                      : 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-500/40 text-purple-200 hover:from-purple-600/50 hover:to-pink-600/50'
                  }`}
                  title="Open Cinema Plugins"
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                  <span className="text-[11px] hidden sm:inline font-bold">Plugins</span>
                </button>

                <button
                  type="button"
                  onClick={toggleCinema}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition cursor-pointer ${
                    theme.isLight
                      ? 'bg-white hover:bg-rose-50 border border-rose-200 text-slate-800 hover:text-amber-700 shadow-sm font-semibold'
                      : 'bg-[#0d0e24] border-slate-800 hover:border-amber-400/50 text-slate-200 hover:text-amber-300'
                  }`}
                  title="Toggle Cinema Lights"
                >
                  <Film className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] hidden sm:inline font-semibold">Cinema</span>
                </button>

                {/* Full Screen Theater Mode with Movable Video Call */}
                <button
                  type="button"
                  onClick={() => playerRef.current?.toggleFullscreen?.()}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-pink-900/30 active:scale-95 border border-pink-400/40"
                  title="Full Screen Theater Mode (Movable Video Call)"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="text-[11px] hidden sm:inline">Full Screen</span>
                </button>
              </div>
            </div>

            {/* Party Grid Mode (Multi-member seat gallery) */}
            {viewMode === 'party' && (
              <CallErrorBoundary title="Member Video Gallery" resetLabel="Reload Gallery">
                <div className={`p-3 rounded-2xl backdrop-blur-xl space-y-2 ${
                  theme.isLight
                    ? 'bg-white/95 border-2 border-rose-200/90 shadow-[0_12px_40px_rgba(244,63,94,0.08)] text-slate-900'
                    : 'bg-[#090a1e]/90 border border-purple-500/30 text-white shadow-xl'
                }`}>
                  <div className={`flex items-center justify-between border-b pb-1.5 text-xs ${
                    theme.isLight ? 'border-rose-200 text-slate-900' : 'border-slate-800'
                  }`}>
                    <span className={`font-bold flex items-center gap-1.5 ${
                      theme.isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <Users className={`h-4 w-4 ${theme.isLight ? 'text-rose-600' : 'text-purple-400'}`} /> Member Gallery ({users.length}/{maxSeats})
                    </span>
                    {me === hostId && (
                      <button
                        type="button"
                        onClick={() => { setCapacityDraft(maxSeats); setShowCapacityModal(true); }}
                        className={`text-xs font-semibold cursor-pointer ${
                          theme.isLight ? 'text-rose-600 hover:text-rose-700' : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        Expand Capacity
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                    {!isGhost && (
                      <div className={`relative aspect-video rounded-xl overflow-hidden shadow-md ${
                        theme.isLight ? 'bg-rose-50 border-2 border-rose-200/80' : 'bg-[#222222] border border-pink-500/20'
                      }`}>
                        <Tile stream={callMedia?.mine} name="You" isPartner={false} voiceOnly={callMedia?.voiceOnly} isSpeaking={callMedia?.localTalking} isCamOff={!callCam} isMicMuted={!callMic} className="w-full h-full aspect-video" />
                      </div>
                    )}
                    {users.filter(u => u.id !== me).map((u) => (
                      <div key={u.id} className={`relative aspect-video rounded-xl overflow-hidden shadow-md group ${
                        theme.isLight ? 'bg-rose-50 border-2 border-rose-200/80' : 'bg-[#222222] border border-pink-500/20'
                      }`}>
                        <Tile stream={callMedia?.remote?.[u.id]} name={u.name} isPartner={true} voiceOnly={callMedia?.voiceOnly} isSpeaking={!!callMedia?.remoteTalking?.[u.id]} isCamOff={!!callMedia?.remoteCamOff?.[u.id]} isMicMuted={!!callMedia?.remoteMicMuted?.[u.id]} className="w-full h-full aspect-video" />
                        {me === hostId && (
                          <button
                            type="button"
                            onClick={() => handleKickUser(u.id, u.name)}
                            title={`Kick ${u.name} from room`}
                            className={`absolute top-1 right-1 p-1 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer shadow z-10 ${
                              theme.isLight
                                ? 'bg-white hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200'
                                : 'bg-[#222222]/90 hover:bg-pink-600 text-pink-200 hover:text-white border border-pink-500/30'
                            }`}
                          >
                            <UserX className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CallErrorBoundary>
            )}

            {/* Mobile / Tablet Interactive Tabs Deck (Reachable via smooth scroll) */}
            <div className={`lg:hidden flex flex-col rounded-2xl ${theme.asideBg} border ${theme.borderColor} shadow-2xl overflow-hidden mt-3 backdrop-blur-xl transition-all duration-500 ${cinema ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              {/* Tab Selector Nav Header */}
              <div className={`shrink-0 flex items-center border-b ${theme.borderColor} ${theme.tabBg} p-1.5 gap-1`}>
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare, badge: chat.length },
                  { id: 'call', label: 'Duo Cam', icon3d: DuoCam3D, activeDot: callCam },
                  { id: 'gestures', label: 'Love', icon3d: Heart3D },
                  { id: 'extras', label: 'Extras', icon3d: Popcorn3D },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const Icon3D = tab.icon3d;
                  const active = mobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMobileTab(tab.id)}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
                        active
                          ? 'btn-pink text-white shadow-md shadow-pink-500/30'
                          : theme.isLight
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-rose-100/60 font-semibold'
                            : 'text-pink-200/70 hover:text-pink-100 hover:bg-pink-500/10'
                      }`}
                    >
                      <div className="relative flex items-center">
                        {Icon3D ? <Icon3D size={18} /> : <Icon className="h-4 w-4" />}
                        {tab.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 bg-pink-500 text-white text-[9px] font-bold px-1 min-w-[13px] h-[13px] rounded-full flex items-center justify-center">
                            {tab.badge > 99 ? '99+' : tab.badge}
                          </span>
                        )}
                        {tab.activeDot !== undefined && (
                          <span className={`absolute -top-0.5 -right-1 h-2 w-2 rounded-full ring-1 ring-black ${tab.activeDot ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        )}
                      </div>
                      <span className="text-[11px] font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Tab Content Body */}
              <div className="p-2 sm:p-3 min-h-[420px] max-h-[600px] overflow-y-auto">
                {mobileTab === 'chat' && (
                  <div className="h-[460px]">
                    <ChatPanel
                      socket={socket}
                      me={me}
                      name={name}
                      users={users}
                      hostId={hostId}
                      chat={chat}
                      playerRef={playerRef}
                      say={say}
                      isMobile={true}
                    />
                  </div>
                )}
                {mobileTab === 'call' && (
                  <CallErrorBoundary title="Duo Cam Stream" resetLabel="Reload Camera Feed">
                    <MobileCallTabDeck
                      users={users}
                      me={me}
                      hostId={hostId}
                      callCam={callCam}
                      callMic={callMic}
                      callMedia={callMedia}
                      callControlsRef={callControlsRef}
                      isGhost={isGhost}
                      handleKickUser={handleKickUser}
                      copy={copy}
                    />
                  </CallErrorBoundary>
                )}
                {mobileTab === 'gestures' && (
                  <div className="p-1">
                    <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} theme={theme} />
                  </div>
                )}
                {mobileTab === 'extras' && (
                  <div className="p-1">
                    <MovieNightExtras
                      socket={socket}
                      me={me}
                      name={name}
                      users={users}
                      queue={queue}
                      watchlist={watchlist}
                      currentMedia={currentMedia}
                      timer={timer}
                      readyCheck={readyCheck}
                      reviews={reviews}
                      isHost={me === hostId}
                      say={say}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Desktop Right Column: Interactive Deck */}
          {viewMode !== 'focus' && (
            <aside className={`hidden lg:flex w-80 xl:w-96 shrink-0 flex flex-col rounded-2xl ${theme.asideBg} border ${theme.borderColor} shadow-2xl sticky top-20 h-[calc(100vh-6rem)] overflow-hidden backdrop-blur-xl transition-all duration-500 ${cinema ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              {/* Tab Selector Header */}
              <div className={`shrink-0 flex items-center border-b ${theme.borderColor} p-1.5 gap-1 ${theme.tabBg}`}>
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'duo', label: 'Duo Cam', icon3d: Heart3D },
                  { id: 'extras', label: 'Extras', icon3d: Popcorn3D },
                  { id: 'gestures', label: 'Love', icon3d: SparkleStar3D },
                ].map((t) => {
                  const Icon = t.icon;
                  const Icon3D = t.icon3d;
                  const active = desktopTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDesktopTab(t.id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'btn-pink text-white shadow-md shadow-pink-500/25'
                          : theme.isLight
                            ? 'text-slate-700 hover:text-slate-950 hover:bg-rose-100/60 font-bold'
                            : 'text-pink-200/70 hover:text-pink-100 hover:bg-pink-500/10'
                      }`}
                    >
                      {Icon3D ? <Icon3D size={16} /> : <Icon className="h-3.5 w-3.5" />}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Body */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {desktopTab === 'chat' && (
                  <div className="flex-1 min-h-0">
                    <ChatPanel
                      socket={socket}
                      me={me}
                      name={name}
                      users={users}
                      hostId={hostId}
                      chat={chat}
                      playerRef={playerRef}
                      say={say}
                      isMobile={false}
                      theme={theme}
                    />
                  </div>
                )}

                {desktopTab === 'duo' && (
                  <CallErrorBoundary title="Date Night Duo Cam" resetLabel="Reload Camera Feed">
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                    <div className={`flex items-center justify-between border-b pb-2 ${theme.isLight ? 'border-slate-200/80' : 'border-slate-800'}`}>
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.isLight ? 'text-slate-800' : 'text-white'}`}>
                        <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/30" />
                        <span>Date Night Duo Cam</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => callControlsRef.current?.toggleVoiceOnly?.()}
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition cursor-pointer ${
                            callMedia.voiceOnly
                              ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                              : theme.isLight
                                ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                                : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:text-white'
                          }`}
                          title="Toggle Voice-Only mode"
                        >
                          {callMedia.voiceOnly ? 'Voice Only 🎙️' : 'Video Mode 🎥'}
                        </button>
                      </div>
                    </div>

                    {users.filter(u => u.id !== me).length > 0 ? (
                      <div className={`grid gap-2.5 ${users.filter(u => u.id !== me).length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
                        {users.filter(u => u.id !== me).map((partner) => (
                          <div key={partner.id} className={`relative aspect-video w-full overflow-hidden rounded-xl border group shadow-md ${
                            theme.isLight ? 'bg-white/80 border-slate-200/90' : 'bg-[#222222] border-pink-500/25 shadow-inner'
                          }`}>
                            <Tile
                              stream={callMedia?.remote?.[partner?.id]}
                              name={partner?.name}
                              isPartner={true}
                              voiceOnly={callMedia?.voiceOnly}
                              isSpeaking={!!callMedia?.remoteTalking?.[partner?.id]}
                              isCamOff={!!callMedia?.remoteCamOff?.[partner?.id]}
                              isMicMuted={!!callMedia?.remoteMicMuted?.[partner?.id]}
                              className="w-full h-full aspect-video"
                            />
                            {me === hostId && (
                              <button
                                type="button"
                                onClick={() => handleKickUser(partner.id, partner.name)}
                                title={`Kick ${partner.name}`}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#222222]/90 hover:bg-pink-600 text-pink-200 hover:text-white border border-pink-500/30 transition shadow z-20 cursor-pointer"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`aspect-video rounded-xl border border-dashed flex flex-col items-center justify-center p-3 text-center space-y-1.5 ${
                        theme.isLight
                          ? 'border-pink-300 bg-pink-50/50 text-slate-700'
                          : 'border-pink-500/30 bg-[#1a1a1a]/60 text-pink-200'
                      }`}>
                        <Heart className="h-6 w-6 text-pink-500 animate-pulse" />
                        <p className={`text-[11px] font-semibold ${theme.isLight ? 'text-slate-800' : 'text-pink-200'}`}>Waiting for your partner to join…</p>
                        <button onClick={copy} className="btn-pink !py-1 !px-2.5 text-[11px]">
                          Copy Invite 💌
                        </button>
                      </div>
                    )}

                    {/* Local User Preview Pip / Ghost Indicator */}
                    {!isGhost ? (
                      <div className={`flex items-center justify-between p-2 rounded-xl border ${
                        theme.isLight
                          ? 'bg-white/90 border-slate-200/90 shadow-sm text-slate-800'
                          : 'bg-[#222222]/90 border-pink-500/20 text-white'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-12 rounded-lg overflow-hidden border shrink-0 ${theme.isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#222222] border-pink-500/25'}`}>
                            <Tile
                              stream={callMedia?.mine}
                              name="You"
                              isPartner={false}
                              voiceOnly={callMedia?.voiceOnly}
                              isSpeaking={callMedia?.localTalking}
                              isCamOff={!callCam}
                              isMicMuted={!callMic}
                              disableFullscreen={true}
                              className="w-full h-full !aspect-auto"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-[11px] font-bold truncate ${theme.isLight ? 'text-slate-800' : 'text-white'}`}>You</div>
                            <div className={`text-[9px] ${theme.isLight ? 'text-slate-500' : 'text-slate-400'}`}>{callCam ? 'Camera Live' : 'Camera Off'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try { await callControlsRef.current?.toggleCam?.(); } catch (err) { console.warn('toggleCam error:', err); }
                            }}
                            className={`p-1.5 rounded-lg border ${callCam ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30'}`}
                            title="Toggle Cam"
                          >
                            {callCam ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => callControlsRef.current?.toggleMic?.()}
                            className={`p-1.5 rounded-lg border ${callMic ? theme.isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-800 text-white border-slate-700' : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30'}`}
                            title="Toggle Mic"
                          >
                            {callMic ? <Mic className="h-3 w-3 text-sky-600 dark:text-emerald-400" /> : <MicOff className="h-3 w-3 text-amber-500 dark:text-amber-400" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-purple-950/70 border border-purple-500/40 text-center">
                        <span className="text-[11px] text-purple-200 font-bold flex items-center justify-center gap-1.5">
                          👻 Stealth Ghost Active
                        </span>
                        <span className="text-[10px] text-purple-300/80 block">Zero camera or mic hardware used &bull; 100% Invisible</span>
                      </div>
                    )}

                    {/* Quick Romantic Actions */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => socket?.emit('nudge')}
                        className="p-1.5 rounded-lg bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/25 text-rose-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                      >
                        <Heart className="h-3 w-3 text-rose-400 fill-rose-500/30" />
                        <span>Miss You</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerReaction('❤️')}
                        className="p-1.5 rounded-lg bg-purple-600/15 border border-purple-500/30 hover:bg-purple-600/25 text-purple-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                      >
                        <span>Kiss 💋</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowPlugins(true); setPluginsTab('keepsake'); }}
                        className="p-1.5 rounded-lg bg-pink-600/15 border border-pink-500/30 hover:bg-pink-600/25 text-pink-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                      >
                        <Camera className="h-3 w-3 text-pink-400" />
                        <span>Polaroid</span>
                      </button>
                    </div>
                  </div>
                  </CallErrorBoundary>
                )}

                {desktopTab === 'extras' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3">
                    <MovieNightExtras
                      socket={socket}
                      me={me}
                      name={name}
                      users={users}
                      queue={queue}
                      watchlist={watchlist}
                      currentMedia={currentMedia}
                      timer={timer}
                      readyCheck={readyCheck}
                      reviews={reviews}
                      isHost={me === hostId}
                      say={say}
                      theme={theme}
                    />
                  </div>
                )}

                {desktopTab === 'gestures' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3">
                    <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} theme={theme} />
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Video Call Overlay (CouplesOverlay) */}
          <CallErrorBoundary fallback={null}>
            <CouplesOverlay
              me={me}
              users={users}
              peerRef={peerRef}
              onScreen={setScreen}
              showCall={showCall && viewMode !== 'duo' && viewMode !== 'party'}
              setShowCall={setShowCall}
              socket={socket}
              onVoiceActivity={setVoiceActive}
              callControlsRef={callControlsRef}
              onCamChange={setCallCam}
              onMicChange={setCallMic}
              onStreamsChange={setCallMedia}
              isMobileCallActive={mobileTab === 'call'}
              onSwitchToCallTab={() => setMobileTab('call')}
              isGhost={isGhost}
              theme={theme}
            />
          </CallErrorBoundary>
        </div>
      )}

      {/* Cross-Device Handoff & Watch History Modal */}
      <WatchHistoryModal
        isOpen={showHandoff}
        onClose={() => setShowHandoff(false)}
        roomId={roomId}
        roomPass={sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || ''}
        onPlayUrl={(u) => socket.emit('media:set', { media: { type: 'auto', src: u } })}
        say={say}
        theme={theme}
      />

      {/* Host Room Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-4">
          <div className={`card w-full max-w-md p-6 space-y-4 rounded-3xl shadow-2xl rise transition-all ${
            theme.isLight
              ? 'border-2 border-rose-200/90 bg-white/98 shadow-[0_20px_60px_rgba(244,63,94,0.12)] text-slate-900'
              : 'border border-pink-500/25 !bg-[#222222] shadow-pink-500/10 text-pink-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme.isLight ? 'border-rose-100' : 'border-pink-500/15'}`}>
              <h3 className={`font-display font-bold text-base flex items-center gap-2 ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                <Users className={`h-5 w-5 ${theme.isLight ? 'text-rose-600' : 'text-pink-400'}`} />
                <span>Room Capacity Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCapacityModal(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  theme.isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-rose-50'
                    : 'text-pink-300/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className={`text-xs font-medium ${theme.isLight ? 'text-slate-600' : 'text-pink-200/70'}`}>
              Select maximum members allowed in this room (Host can expand anytime up to 30 members).
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { count: 2, label: '2 Seats', sub: 'Couples' },
                { count: 3, label: '3 Seats', sub: 'Trio' },
                { count: 4, label: '4 Seats', sub: 'Double Date' },
                { count: 6, label: '6 Seats', sub: 'Friends' },
                { count: 8, label: '8 Seats', sub: 'Party' },
                { count: 10, label: '10 Seats', sub: 'Squad' },
                { count: 15, label: '15 Seats', sub: 'Club' },
                { count: 20, label: '20 Seats', sub: 'Mega' },
                { count: 25, label: '25 Seats', sub: 'Ultra' },
                { count: 30, label: '30 Seats', sub: 'Max 30' },
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setCapacityDraft(opt.count)}
                  className={`rounded-2xl p-2.5 text-center border-2 transition-all cursor-pointer ${
                    capacityDraft === opt.count
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white shadow-lg shadow-pink-500/30 font-bold scale-[1.02]'
                      : theme.isLight
                        ? 'bg-rose-50/60 border-rose-200/80 text-slate-800 hover:border-rose-300 hover:bg-rose-100/60 shadow-xs'
                        : 'bg-[#1a1a1d] border-pink-500/15 text-pink-200/70 hover:border-pink-500/35 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold">{opt.label}</span>
                  <span className={`block text-[10px] font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300/50'}`}>{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Stepper / Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs">
                <span className={`font-semibold ${theme.isLight ? 'text-slate-600' : 'text-pink-200/70'}`}>Custom Member Limit:</span>
                <span className={`font-bold font-mono ${theme.isLight ? 'text-rose-600' : 'text-pink-400'}`}>{capacityDraft} Members</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                value={capacityDraft}
                onChange={(e) => setCapacityDraft(parseInt(e.target.value, 10))}
                className="w-full accent-pink-500 h-2 bg-pink-500/20 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  socket.emit('room:set_max_users', { maxUsers: capacityDraft }, (res) => {
                    if (res?.ok) {
                      setMaxSeats(res.maxUsers);
                      say(`👥 Room capacity updated to ${res.maxUsers} members!`);
                      setShowCapacityModal(false);
                    } else {
                      say(res?.message || 'Failed to update capacity');
                    }
                  });
                }}
                className="btn-pink flex-1 !py-2.5 text-xs font-bold rounded-xl shadow-lg shadow-pink-500/30 cursor-pointer active:scale-95"
              >
                Apply Capacity ({capacityDraft} Members)
              </button>
              <button
                type="button"
                onClick={() => setShowCapacityModal(false)}
                className={`py-2.5 px-4 text-xs font-semibold rounded-xl border-2 transition cursor-pointer ${
                  theme.isLight
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'border-pink-500/20 text-pink-200 hover:text-white hover:bg-white/5'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-4">
          <div className={`card w-full max-w-sm p-6 space-y-4 rounded-3xl shadow-2xl rise transition-all ${
            theme.isLight
              ? 'border-2 border-rose-200/90 bg-white/98 shadow-[0_20px_60px_rgba(244,63,94,0.12)] text-slate-900'
              : 'border border-pink-500/25 !bg-[#222222] shadow-pink-500/10 text-pink-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${theme.isLight ? 'border-rose-100' : 'border-pink-500/15'}`}>
              <h3 className={`font-display font-semibold text-base flex items-center gap-2 ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                <Lock className={`h-4 w-4 ${theme.isLight ? 'text-rose-600' : 'text-pink-400'}`} /> Room Password
              </h3>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  theme.isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-rose-50'
                    : 'text-pink-300/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-semibold block mb-1 ${theme.isLight ? 'text-slate-700' : 'text-pink-200/70'}`}>
                  {me === hostId ? 'Room Password (Host Control)' : 'Room Password'}
                </label>
                <div className="relative">
                  <input
                    type={passVisible ? 'text' : 'password'}
                    value={newPassDraft}
                    onChange={(e) => setNewPassDraft(e.target.value)}
                    readOnly={me !== hostId}
                    placeholder="Room password"
                    minLength={4}
                    maxLength={64}
                    className={`w-full px-4 py-2.5 !pr-20 text-center font-mono text-base rounded-xl transition ${
                      theme.isLight
                        ? 'bg-rose-50/60 border-2 border-rose-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-rose-500'
                        : 'field !bg-[#1a1a1d] border border-pink-500/25 text-pink-100'
                    }`}
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPassVisible(!passVisible)}
                      className={`p-1 transition cursor-pointer ${theme.isLight ? 'text-slate-500 hover:text-slate-900' : 'text-pink-300/70 hover:text-white'}`}
                      title={passVisible ? 'Hide' : 'Show'}
                    >
                      {passVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (newPassDraft) {
                          navigator.clipboard.writeText(newPassDraft);
                          say('Room password copied 📋');
                        }
                      }}
                      className={`p-1 transition cursor-pointer ${theme.isLight ? 'text-slate-500 hover:text-slate-900' : 'text-pink-300/70 hover:text-white'}`}
                      title="Copy password"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className={`text-[11px] font-medium mt-1 ${theme.isLight ? 'text-slate-500' : 'text-pink-300/50'}`}>
                  {me === hostId
                    ? 'As the room host, you can edit this password at any time.'
                    : 'Share this password only with your partner.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border-2 transition cursor-pointer ${
                    theme.isLight
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'border-pink-500/20 text-pink-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Close
                </button>
                {me === hostId && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = newPassDraft.trim();
                      if (!p || p.length < 4) {
                        say('Password must be at least 4 characters');
                        return;
                      }
                      socket.emit('room:update_pass', { pass: p }, (res) => {
                        if (res?.ok) {
                          sessionStorage.setItem('rp_' + roomId, p);
                          try { localStorage.setItem('rp_' + roomId, p); } catch {}
                          setShowPassModal(false);
                          say('Room password updated successfully 🔒');
                        } else {
                          say(res?.message || 'Failed to update password');
                        }
                      });
                    }}
                    className="btn-pink !py-2 text-xs font-bold rounded-xl shadow-md shadow-pink-500/30 cursor-pointer"
                  >
                    Save New Password
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Ambiance & Color Themes Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className={`w-full max-w-xl p-5 sm:p-6 space-y-5 rounded-3xl backdrop-blur-2xl shadow-2xl rise my-auto text-left transition-all ${
            theme.isLight
              ? 'bg-white/98 border-2 border-rose-200/90 shadow-[0_20px_60px_rgba(244,63,94,0.12)] text-slate-900'
              : 'bg-[#222222]/95 border border-pink-500/25 shadow-pink-500/10 text-pink-100'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3 ${theme.isLight ? 'border-rose-100' : 'border-pink-500/15'}`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-pink-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-base sm:text-lg flex items-center gap-2 ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                    Room Color Themes &amp; Ambiance
                  </h3>
                  <p className={`text-[11px] font-medium ${theme.isLight ? 'text-slate-500' : 'text-pink-300'}`}>Transform the auditorium lighting &amp; vibe</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                  theme.isLight
                    ? 'bg-rose-50 hover:bg-rose-100 text-slate-700 hover:text-slate-950 border border-rose-200'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {Object.values(ROOM_THEMES).map((th) => {
                const isActive = currentThemeId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => selectTheme(th.id)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition relative cursor-pointer flex flex-col justify-between gap-3 shadow-xs ${
                      isActive
                        ? theme.isLight
                          ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/30 shadow-md text-slate-900'
                          : `bg-white/10 ${th.cardBorder} ring-2 ring-pink-500/50 shadow-xl shadow-pink-950/40 text-white`
                        : theme.isLight
                          ? 'bg-white hover:bg-rose-50 border-rose-200/80 hover:border-rose-300 text-slate-900'
                          : 'bg-[#1a1a1a]/70 border-pink-500/20 hover:border-pink-500/40 hover:bg-white/5 text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{th.icon}</span>
                        <div>
                          <h4 className={`font-bold text-sm flex items-center gap-1.5 ${theme.isLight ? 'text-slate-900' : 'text-white'}`}>
                            <span>{th.name}</span>
                            {th.id === 'midnight' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-semibold">
                                Home Look
                              </span>
                            )}
                          </h4>
                          <p className={`text-[10px] font-medium ${theme.isLight ? 'text-slate-600' : 'text-slate-400'}`}>{th.tag}</p>
                        </div>
                      </div>
                      {isActive && (
                        <div className="h-5 w-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs shadow-md shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Color Swatch Strip */}
                    <div className="flex items-center gap-1.5 w-full pt-1">
                      {th.swatches.map((color, idx) => (
                        <span
                          key={idx}
                          className="h-3 flex-1 rounded-full shadow-inner border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Options Strip */}
            <div className={`pt-2 border-t space-y-3 ${theme.isLight ? 'border-rose-100' : 'border-white/10'}`}>
              {/* Wallpaper Toggle */}
              <div className={`flex items-center justify-between p-3 rounded-2xl border-2 ${
                theme.isLight ? 'bg-rose-50/60 border-rose-200/80 shadow-xs' : 'bg-white/5 border-white/10'
              }`}>
                <div className="space-y-0.5">
                  <div className={`text-xs font-semibold flex items-center gap-1.5 ${theme.isLight ? 'text-slate-900' : 'text-pink-100'}`}>
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                    <span>Romantic Ambient Wallpaper</span>
                  </div>
                  <p className={`text-[11px] font-medium ${theme.isLight ? 'text-slate-600' : 'text-pink-200/70'}`}>Display subtle couple watching background behind the theater</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showWallpaper;
                    setShowWallpaper(next);
                    try { localStorage.setItem('sc_show_wallpaper', next ? '1' : '0'); } catch {}
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    showWallpaper ? 'bg-pink-600' : theme.isLight ? 'bg-slate-300' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      showWallpaper ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Host Sync Theme Button */}
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => selectTheme(currentThemeId, true)}
                  className={`w-full py-2.5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer border-2 ${
                    theme.isLight
                      ? 'bg-white hover:bg-rose-50 border-rose-200/80 text-rose-700 shadow-xs'
                      : 'bg-white/10 hover:bg-white/15 border-pink-500/20 text-pink-100'
                  }`}
                >
                  <Crown className="h-3.5 w-3.5 text-pink-500" />
                  <span>Sync &ldquo;{ROOM_THEMES[currentThemeId]?.name}&rdquo; To All Room Members</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-xs shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                Apply &amp; Enjoy Movie Night ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modular Cinema Plugins Suite Modal */}
      <CinemaPlugins
        isOpen={showPlugins}
        onClose={() => setShowPlugins(false)}
        socket={socket}
        me={me}
        hostId={hostId}
        users={users}
        currentMedia={currentMedia}
        timer={timer}
        say={say}
        defaultTab={pluginsTab}
        onTriggerReaction={triggerReaction}
        callMedia={callMedia}
        playerRef={playerRef}
        theme={theme}
      />

      {/* Toast notifications */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-16 sm:bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.n}
            className={`toast rounded-full px-4 py-2 text-xs sm:text-sm backdrop-blur-md shadow-2xl transition-all ${
              theme.isLight
                ? 'bg-white/98 text-slate-900 border-2 border-rose-200/90 shadow-[0_12px_40px_rgba(244,63,94,0.15)] font-bold'
                : 'bg-[#222222]/95 text-pink-100 border border-pink-500/30'
            }`}
          >
            {toast.m}
          </div>
        )}
      </div>
    </div>
  );
}
